/**
 * The address of the visitor behind the reverse proxy.
 *
 * Behind nginx or Caddy, the address a Node server sees is the proxy's. The
 * real one travels in `X-Real-IP` (set by the proxy from the connection) or at
 * the END of `X-Forwarded-For`: the proxy appends the address it saw, and
 * anything before it was written by the visitor and proves nothing. Reading
 * the first entry, as was done before, lets anyone choose their own bucket.
 *
 * The headers are believed only when the connection comes from the proxy
 * itself (loopback or a private network). From anywhere else they are
 * ignored: a visitor who reaches the port directly gets the address of the
 * connection.
 */

export interface ForwardedHeaders {
  readonly realIp?: string | null | undefined;
  readonly forwardedFor?: string | null | undefined;
}

/** Loopback, private ranges (docker bridge, LAN) and unique-local IPv6. */
export function isProxyAddress(address: string): boolean {
  const ip = address.replace(/^::ffff:/i, '').toLowerCase();
  if (ip === '::1' || ip === 'localhost') return true;
  if (/^fc[0-9a-f]{2}:|^fd[0-9a-f]{2}:/.test(ip)) return true;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts as [number, number, number, number];
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function clean(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/^::ffff:/i, '');
}

export function resolveClientIp(peer: string | undefined, headers: ForwardedHeaders): string {
  const socket = clean(peer) || 'unknown';
  if (socket === 'unknown' || !isProxyAddress(socket)) return socket;
  const real = clean(headers.realIp);
  if (real) return real;
  const hops = (headers.forwardedFor ?? '').split(',');
  return clean(hops[hops.length - 1]) || socket;
}
