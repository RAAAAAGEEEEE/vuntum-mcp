import type { IncomingMessage } from 'node:http';
import { SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';

/**
 * Checks made before a request reaches the MCP transport (security review,
 * task 346). Pure functions, so the tests can run them without a socket.
 */

/** nginx already cuts bodies at 64 KiB; the server says the same on its own. */
export const MAX_BODY_BYTES = 64 * 1024;

export type GuardVerdict =
  | { readonly ok: true; readonly body: unknown }
  | { readonly ok: false; readonly status: number; readonly error: string };

/**
 * The server is stateless and never pushes anything: a GET would only open an
 * event stream that stays idle until the proxy times out, so only POST is
 * accepted, as in the SDK's stateless example.
 */
export function methodAllowed(method: string | undefined): boolean {
  return method === 'POST';
}

/**
 * One JSON-RPC message per HTTP request. The rate limit counts requests, and a
 * batch of a hundred searches in one POST would cost a hundred times more
 * database time than the limit assumes.
 */
export function checkBody(raw: string): GuardVerdict {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, error: 'invalid JSON' };
  }
  if (Array.isArray(body) && body.length !== 1) {
    return { ok: false, status: 400, error: 'send one JSON-RPC message per request' };
  }
  return { ok: true, body };
}

/** Reads the body, refusing it as soon as it grows past the limit. */
export async function readBody(req: IncomingMessage, max = MAX_BODY_BYTES): Promise<string | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > max) return null;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * The rate-limit bucket of an address. An IPv6 subscriber gets a whole /64,
 * so counting single addresses would let one visitor pick a new bucket for
 * every request: the bucket is the /64 prefix.
 */
export function rateKey(ip: string): string {
  if (!ip.includes(':')) return ip;
  if (/^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(ip)) return ip.slice(7);
  const bare = ip.split('%')[0] ?? ip;
  const [head = '', tail] = bare.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const missing = tail === undefined ? 0 : 8 - left.length - right.length;
  const groups = [...left, ...Array<string>(Math.max(0, missing)).fill('0'), ...right];
  const prefix = groups
    .slice(0, 4)
    .map((g) => (g || '0').toLowerCase().replace(/^0+(?=.)/, ''))
    .join(':');
  return `${prefix}::/64`;
}

/**
 * The SDK answers 400 to a request whose `mcp-protocol-version` header names a
 * version it does not know (about 20 a day from Claude-User, the 198-byte
 * answer in the nginx log). The server is stateless and the tools do not
 * depend on the version, so a header from a newer or older client is dropped
 * (the SDK then assumes its default) instead of refusing a valid request.
 * Returns the dropped value, or null when the header was fine or absent.
 */
export function dropUnknownProtocolVersion(
  req: Pick<IncomingMessage, 'headers' | 'rawHeaders'>,
): string | null {
  const headers = req.headers;
  const raw = headers['mcp-protocol-version'];
  if (raw === undefined) return null;
  const value = (Array.isArray(raw) ? raw.join(',') : raw).trim();
  if (value === '' || SUPPORTED_PROTOCOL_VERSIONS.includes(value)) return null;
  delete headers['mcp-protocol-version'];
  // The Node to Web request adapter reads `rawHeaders`, not `headers`.
  for (let i = req.rawHeaders.length - 2; i >= 0; i -= 2) {
    if (req.rawHeaders[i]?.toLowerCase() === 'mcp-protocol-version') req.rawHeaders.splice(i, 2);
  }
  return value.slice(0, 40);
}
