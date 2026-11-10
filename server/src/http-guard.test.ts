import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { checkBody, dropUnknownProtocolVersion, Ipv6Grouping, methodAllowed, MinuteLimiter, prefix48, rateKey, readBody } from './http-guard.js';

describe('MCP HTTP guard', () => {
  it('accepts POST only, so no idle event stream can be opened', () => {
    expect(methodAllowed('POST')).toBe(true);
    for (const method of ['GET', 'DELETE', 'HEAD', 'OPTIONS', undefined]) {
      expect(methodAllowed(method)).toBe(false);
    }
  });

  it('takes one JSON-RPC message per request and refuses batches', () => {
    const call = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
    expect(checkBody(JSON.stringify(call))).toEqual({ ok: true, body: call });
    expect(checkBody(JSON.stringify([call]))).toEqual({ ok: true, body: [call] });
    const batch = checkBody(JSON.stringify([call, { ...call, id: 2 }]));
    expect(batch.ok).toBe(false);
    if (!batch.ok) expect(batch.status).toBe(400);
    expect(checkBody('[]').ok).toBe(false);
    expect(checkBody('{not json').ok).toBe(false);
  });

  it('stops reading a body that grows past the limit', async () => {
    const stream = (text: string) =>
      Readable.from([Buffer.from(text)]) as unknown as IncomingMessage;
    expect(await readBody(stream('{"a":1}'), 64)).toBe('{"a":1}');
    expect(await readBody(stream('x'.repeat(65)), 64)).toBeNull();
  });

  it('counts an IPv6 visitor by /64, so rotating addresses changes nothing', () => {
    expect(rateKey('203.0.113.7')).toBe('203.0.113.7');
    expect(rateKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(rateKey('2001:db8:1:2:aaaa::1')).toBe('2001:db8:1:2::/64');
    expect(rateKey('2001:db8:1:2:bbbb:cccc:dddd:eeee')).toBe('2001:db8:1:2::/64');
    expect(rateKey('2001:0DB8:0001:0002::9')).toBe('2001:db8:1:2::/64');
    expect(rateKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(rateKey('::1')).toBe('0:0:0:0::/64');
  });

  it('drops a protocol version header the SDK would refuse with a 400', () => {
    const req = {
      headers: { accept: 'application/json', 'mcp-protocol-version': '2099-01-01' },
      rawHeaders: ['Accept', 'application/json', 'MCP-Protocol-Version', '2099-01-01'],
    } as Pick<IncomingMessage, 'headers' | 'rawHeaders'>;
    expect(dropUnknownProtocolVersion(req)).toBe('2099-01-01');
    expect(req.headers['mcp-protocol-version']).toBeUndefined();
    expect(req.rawHeaders).toEqual(['Accept', 'application/json']);
    const known = {
      headers: { 'mcp-protocol-version': '2025-06-18' },
      rawHeaders: ['mcp-protocol-version', '2025-06-18'],
    } as Pick<IncomingMessage, 'headers' | 'rawHeaders'>;
    expect(dropUnknownProtocolVersion(known)).toBeNull();
    expect(known.rawHeaders).toHaveLength(2);
    expect(dropUnknownProtocolVersion({ headers: {}, rawHeaders: [] })).toBeNull();
  });

  it('groups an IPv6 /48 into one bucket once it shows more than the threshold of /64', () => {
    expect(prefix48('2001:db8:1:2::5')).toBe('2001:db8:1::/48');
    expect(prefix48('203.0.113.7')).toBeNull();
    const grouping = new Ipv6Grouping(4);
    const now = new Date('2026-11-10T10:00:00Z');
    // A household keeps its own /64.
    expect(grouping.bucket('2001:db8:1:a::1', now)).toBe('2001:db8:1:a::/64');
    expect(grouping.bucket('2001:db8:1:a::2', now)).toBe('2001:db8:1:a::/64');
    expect(grouping.bucket('2001:db8:1:b::1', now)).toBe('2001:db8:1:b::/64');
    expect(grouping.bucket('2001:db8:1:c::1', now)).toBe('2001:db8:1:c::/64');
    expect(grouping.bucket('2001:db8:1:d::1', now)).toBe('2001:db8:1:d::/64');
    // Rotating through the /48: from the fifth /64 on, one bucket for the whole /48.
    const buckets = new Set<string>();
    for (let i = 0; i < 1000; i += 1) buckets.add(grouping.bucket(`2001:db8:1:${(0x100 + i).toString(16)}::1`, now));
    expect([...buckets]).toEqual(['2001:db8:1::/48']);
    // Another /48 and IPv4 are untouched; the next day starts again.
    expect(grouping.bucket('2001:db8:2:a::1', now)).toBe('2001:db8:2:a::/64');
    expect(grouping.bucket('203.0.113.7', now)).toBe('203.0.113.7');
    expect(grouping.bucket('2001:db8:1:999::1', new Date('2026-11-11T00:00:01Z'))).toBe('2001:db8:1:999::/64');
  });

  it('keeps the grouped /48 when its table is full, forgetting the smallest ones', () => {
    const grouping = new Ipv6Grouping(2, 10);
    const now = new Date('2026-11-10T10:00:00Z');
    for (let i = 0; i < 5; i += 1) grouping.bucket(`2001:db8:1:${i}::1`, now);
    expect(grouping.bucket('2001:db8:1:99::1', now)).toBe('2001:db8:1::/48');
    // A thousand other /48 seen once each: the table stays bounded, the rotating /48 stays grouped.
    for (let i = 0; i < 1000; i += 1) grouping.bucket(`2001:db8:${(0x1000 + i).toString(16)}:1::1`, now);
    expect(grouping.bucket('2001:db8:1:abc::1', now)).toBe('2001:db8:1::/48');
  });

  it('lets a newcomer in when the per-minute table is full of live windows', () => {
    const limiter = new MinuteLimiter(10, 60_000);
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) limiter.limited('regular', 60, now);
    for (let i = 0; i < 1000; i += 1) expect(limiter.limited(`rot-${i}`, 60, now)).toBe(false);
    expect(limiter.size).toBeLessThanOrEqual(10);
    expect(limiter.limited('newcomer', 60, now)).toBe(false);
    // The regular visitor's window is kept: still counted, and cut past its limit.
    for (let i = 0; i < 55; i += 1) expect(limiter.limited('regular', 60, now)).toBe(false);
    expect(limiter.limited('regular', 60, now)).toBe(true);
    // Over windows are forgotten first.
    expect(limiter.limited('regular', 60, now + 61_000)).toBe(false);
  });
});
