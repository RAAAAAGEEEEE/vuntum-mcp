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

/** The groups of an IPv6 address, written out in full (null for IPv4 and IPv4-mapped). */
function ipv6Groups(ip: string): string[] | null {
  if (!ip.includes(':')) return null;
  if (/^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(ip)) return null;
  const bare = ip.split('%')[0] ?? ip;
  const [head = '', tail] = bare.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const missing = tail === undefined ? 0 : 8 - left.length - right.length;
  return [...left, ...Array<string>(Math.max(0, missing)).fill('0'), ...right].map((g) =>
    (g || '0').toLowerCase().replace(/^0+(?=.)/, ''),
  );
}

/**
 * The rate-limit bucket of an address. An IPv6 subscriber gets a whole /64,
 * so counting single addresses would let one visitor pick a new bucket for
 * every request: the bucket is the /64 prefix.
 */
export function rateKey(ip: string): string {
  const groups = ipv6Groups(ip);
  if (groups === null) return /^::ffff:/i.test(ip) ? ip.slice(7) : ip;
  return `${groups.slice(0, 4).join(':')}::/64`;
}

/** The /48 an IPv6 address belongs to (null for IPv4). */
export function prefix48(ip: string): string | null {
  const groups = ipv6Groups(ip);
  return groups === null ? null : `${groups.slice(0, 3).join(':')}::/48`;
}

/**
 * IPv6 buckets grouped by /48 past a threshold. A free /48 holds 65 536 /64: counted by /64 only, one visitor
 * could fill the quota tables. Once more than `perPrefix` different /64 of one
 * /48 have been seen today, the whole /48 shares one bucket. A household or an
 * office uses one /64, so they keep their own; a mobile carrier's /48 shared by
 * many phones could be grouped, but phones rarely call the MCP server
 * themselves (the assistants' connectors do, from their own addresses).
 * Every request counts towards the threshold, liveness probes included. A
 * verified assistant's connector is never grouped (server-http.ts): Anthropic's
 * official IPv6 range is exactly one /48 shared by all Claude users.
 */
export class Ipv6Grouping {
  private readonly seen = new Map<string, Set<string>>();
  private day = '';

  constructor(
    private readonly perPrefix = 32,
    private readonly maxPrefixes = 20_000,
  ) {}

  bucket(ip: string, now = new Date()): string {
    const own = rateKey(ip);
    const wide = prefix48(ip);
    if (wide === null) return own;
    const today = now.toISOString().slice(0, 10);
    if (today !== this.day) {
      this.seen.clear();
      this.day = today;
    }
    let subnets = this.seen.get(wide);
    if (!subnets) {
      if (this.seen.size >= this.maxPrefixes) this.forgetSmallest();
      subnets = new Set();
      this.seen.set(wide, subnets);
    }
    if (subnets.size > this.perPrefix) return wide;
    subnets.add(own);
    return subnets.size > this.perPrefix ? wide : own;
  }

  /** A full table forgets the /48 with the fewest /64, a tenth of it: the grouped ones stay grouped. */
  private forgetSmallest(): void {
    const drop = Math.max(1, Math.floor(this.maxPrefixes / 10));
    const smallest = [...this.seen].sort((a, b) => a[1].size - b[1].size).slice(0, drop);
    for (const [prefix] of smallest) this.seen.delete(prefix);
  }
}

/**
 * Requests per bucket and per minute. A table full of live windows used to
 * refuse every newcomer (someone rotating addresses locked everybody out): the
 * smallest windows, a tenth of the table, are forgotten instead.
 */
export class MinuteLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly maxBuckets = 50_000,
    private readonly windowMs = 60_000,
  ) {}

  /** True when this request is over `max` in the bucket's current window. */
  limited(key: string, max: number, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt < now) {
      if (!entry && this.hits.size >= this.maxBuckets) this.makeRoom(now);
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return false;
    }
    entry.count += 1;
    return entry.count > max;
  }

  get size(): number {
    return this.hits.size;
  }

  private makeRoom(now: number): void {
    for (const [k, value] of this.hits) if (value.resetAt < now) this.hits.delete(k);
    if (this.hits.size < this.maxBuckets) return;
    const drop = Math.max(1, Math.floor(this.maxBuckets / 10));
    const smallest = [...this.hits].sort((a, b) => a[1].count - b[1].count).slice(0, drop);
    for (const [k] of smallest) this.hits.delete(k);
  }
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
