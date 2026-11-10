import { createServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { resolveClientIp } from './net/client-ip.js';
import { createPostgresClient } from './data/sql-client.js';
import { createSqlReader } from './data/sql-reader.js';
import { loadEnv } from './env.js';
import { getLogger } from './logger.js';
import { createMcpServer } from './server.js';
import { installGracefulShutdown } from './graceful-shutdown.js';
import { checkBody, dropUnknownProtocolVersion, methodAllowed, rateKey, readBody } from './http-guard.js';
import { admit, DailyQuota, KeyChecker, keyForLog, PRO_PER_MINUTE, PUBLIC_PER_MINUTE, presentedKey, readyRobotRanges, secondsToUtcMidnight } from './access.js';

/**
 * Remote transport for the public MCP server. Stateless: a fresh server and
 * transport per request, so no cross-request state can leak .
 * Rate limited per IP, like the public API; a daily quota of tool calls for
 * the free access, a key for the pro access .
 */

const log = getLogger('mcp-http');
const WINDOW_MS = 60_000;

const MAX_BUCKETS = 50_000;

const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string, max: number, now = Date.now()): boolean {
  // Forget the windows that are over, so the table cannot grow for ever.
  if (hits.size > 5000) for (const [k, value] of hits) if (value.resetAt < now) hits.delete(k);
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    // Still full of live windows: someone is rotating addresses; newcomers wait.
    if (hits.size >= MAX_BUCKETS) return true;
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

const quota = new DailyQuota();

async function main(): Promise<void> {
  const env = loadEnv();
  // One read-only pool for the whole process; a fresh MCP server per request reads through it.
  const data = createSqlReader(createPostgresClient(env.DATABASE_URL, { max: 20 }));
  const keys = new KeyChecker(data);

  const http = createServer((req, res) => {
    void (async () => {
      // Behind the reverse proxy the socket is the proxy's: the visitor's
      // address is the one the proxy wrote down .
      const header = (name: string): string | undefined => {
        const value = req.headers[name];
        return Array.isArray(value) ? value.join(',') : value;
      };
      const ip = resolveClientIp(req.socket.remoteAddress, {
        realIp: header('x-real-ip'),
        forwardedFor: header('x-forwarded-for'),
      });

      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      if (req.url !== '/mcp') {
        res.writeHead(404).end();
        return;
      }
      if (!methodAllowed(req.method)) {
        res.writeHead(405, { allow: 'POST', 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'method not allowed' }));
        return;
      }
      // The key is never logged: only its prefix (`keyForLog`).
      const key = presentedKey(req.headers);
      // Keyed requests have their own, wider, bucket per address, so random keys
      // cannot make the server query the database without limit.
      const limited =
        key === null ? rateLimited(rateKey(ip), PUBLIC_PER_MINUTE) : rateLimited(`keyed:${rateKey(ip)}`, PRO_PER_MINUTE);
      if (limited) {
        res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '60' });
        res.end(JSON.stringify({ error: 'rate limit exceeded' }));
        return;
      }
      const raw = await readBody(req);
      if (raw === null) {
        res.writeHead(413, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'request body too large' }));
        return;
      }
      const verdict = checkBody(raw);
      if (!verdict.ok) {
        res.writeHead(verdict.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: verdict.error }));
        return;
      }

      let admission;
      try {
        await readyRobotRanges();
        admission = await admit({
          body: verdict.body,
          bucket: rateKey(ip),
          ip,
          userAgent: header('user-agent'),
          key,
          keys,
          quota,
        });
      } catch (error) {
        log.error({ err: error }, 'api key check failed');
        res.writeHead(503, { 'content-type': 'application/json', 'retry-after': '60' });
        res.end(JSON.stringify({ error: 'key check unavailable' }));
        return;
      }
      if (!admission.ok) {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (admission.error.status === 429) headers['retry-after'] = String(secondsToUtcMidnight());
        if (admission.error.status === 403 && key !== null) log.info({ key: keyForLog(key) }, 'api key refused');
        if (admission.error.status === 429) log.info({ agent: header('user-agent')?.slice(0, 80) }, 'mcp daily quota reached');
        res.writeHead(admission.error.status, headers);
        res.end(JSON.stringify(admission.error.body));
        return;
      }
      if (admission.grant && rateLimited(`key:${admission.grant.keyId}`, PRO_PER_MINUTE)) {
        res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '60' });
        res.end(JSON.stringify({ error: 'rate limit exceeded' }));
        return;
      }
      if (admission.toolCalls > 0) {
        // Counted to tune the quota (agents and volumes), the address is not written.
        log.info(
          {
            access: admission.access,
            agent: header('user-agent')?.slice(0, 80),
            ...(admission.grant ? { keyId: admission.grant.keyId } : {}),
          },
          'mcp tool call',
        );
      }

      const dropped = dropUnknownProtocolVersion(req);
      if (dropped !== null) log.info({ protocolVersion: dropped }, 'unknown mcp-protocol-version ignored');

      const server = createMcpServer({
        data,
        baseUrl: env.VUNTUM_PUBLIC_URL,
        access: admission.access,
      });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
      try {
        await server.connect(transport);
        await transport.handleRequest(req, res, verdict.body);
      } catch (error) {
        log.error({ err: error }, 'mcp request failed');
        if (!res.headersSent) res.writeHead(500).end();
      }
    })();
  });

  http.listen(env.MCP_PORT, env.MCP_HOST, () => {
    log.info({ host: env.MCP_HOST, port: env.MCP_PORT }, 'vuntum MCP server listening');
  });

  // Replaced during a deployment: finish what is in progress .
  const shutdown = installGracefulShutdown(http, {
    log: (message) => log.info(message),
    exit: (code) => void data.close().finally(() => process.exit(code)),
  });
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => void shutdown.stop());
}

main().catch((error: unknown) => {
  console.error('[vuntum-mcp-http] fatal:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
