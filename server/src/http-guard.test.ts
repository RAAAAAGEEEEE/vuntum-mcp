import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { checkBody, dropUnknownProtocolVersion, methodAllowed, rateKey, readBody } from './http-guard.js';

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
});
