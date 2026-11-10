import { describe, expect, it } from 'vitest';
import { RobotRanges } from './net/robot-ranges.js';
import { admit, ASSISTANT_DAILY_TOOL_CALLS, DailyQuota, DIRECTORY_DAILY_TOOL_CALLS, isAssistantAgent, isDirectoryAgent, isVerifiedAssistant, keyForLog, presentedKey, PUBLIC_DAILY_TOOL_CALLS, quotaTier, secondsToUtcMidnight, toolCallCount } from './access.js';
import { attributionFor, withTerms } from './terms.js';

const call = (id = 1) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'get_robot', arguments: { slug: 'g1' } } });
const KEY = `vtm_${'a'.repeat(43)}`;
const noKeys = { check: async () => null };
const OFFICIAL = new RobotRanges({
  fetchedDay: '2026-11-03',
  lists: {
    'chatgpt-user': { prefixes: ['13.65.138.112/28'], published: '2026-10-27' },
    anthropic: { prefixes: ['160.79.104.0/21'], published: '2026-11-03' },
  },
});

describe('MCP free quota', () => {
  it('counts tools/call only, never initialize nor tools/list', () => {
    expect(toolCallCount(call())).toBe(1);
    expect(toolCallCount([call()])).toBe(1);
    expect(toolCallCount({ jsonrpc: '2.0', id: 1, method: 'initialize' })).toBe(0);
    expect(toolCallCount({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).toBe(0);
    expect(toolCallCount({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBe(0);
  });

  it('answers a clear 429 with the pro access link once the day is used up', async () => {
    const quota = new DailyQuota();
    const now = new Date('2026-10-25T10:00:00Z');
    const base = { bucket: '203.0.113.7', userAgent: 'python-httpx/0.27', key: null, keys: noKeys, quota, now };
    for (let i = 0; i < PUBLIC_DAILY_TOOL_CALLS; i += 1) {
      expect((await admit({ ...base, body: call(i) })).ok).toBe(true);
    }
    const refused = await admit({ ...base, body: call(999) });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.error.status).toBe(429);
    expect(refused.error.body.id).toBe(999);
    expect(refused.error.body.error.message).toContain('https://vuntum.com/en/business#demande');
    expect(refused.error.body.error.message).toContain('https://vuntum.com/fr/entreprise#demande');
    expect(refused.error.body.error.message).toContain(`${PUBLIC_DAILY_TOOL_CALLS} tool calls per day`);
    // Opening a session and listing the tools still work: directories see the server up.
    expect((await admit({ ...base, body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } })).ok).toBe(true);
    expect((await admit({ ...base, body: { jsonrpc: '2.0', id: 1, method: 'initialize' } })).ok).toBe(true);
    // Another address and the next UTC day start again.
    expect((await admit({ ...base, bucket: '198.51.100.1', body: call() })).ok).toBe(true);
    expect((await admit({ ...base, now: new Date('2026-10-26T00:00:01Z'), body: call() })).ok).toBe(true);
  });

  it('gives the identified MCP directories a higher quota, with the same free answers', async () => {
    const quota = new DailyQuota();
    const ua = 'mcpbeat/0.1 (+https://mcpbeat.com/bot/; liveness check)';
    expect(isDirectoryAgent(ua)).toBe(true);
    expect(isDirectoryAgent('FixterMonitoring/1.0 (+https://fixter.dev)')).toBe(true);
    expect(isDirectoryAgent('python-httpx2/2.15.1')).toBe(false);
    expect(isDirectoryAgent(undefined)).toBe(false);
    let last;
    for (let i = 0; i <= PUBLIC_DAILY_TOOL_CALLS; i += 1) {
      last = await admit({ body: call(i), bucket: '192.0.2.9', userAgent: ua, key: null, keys: noKeys, quota });
    }
    expect(last).toMatchObject({ ok: true, access: 'public' });
    expect(DIRECTORY_DAILY_TOOL_CALLS).toBeGreaterThan(PUBLIC_DAILY_TOOL_CALLS);
  });

  it('caps a directory name, which anyone can write, at a modest quota', async () => {
    // `User-Agent: glama` used to open 2 000 calls a day; it now opens 300, below the assistants' quota.
    expect(DIRECTORY_DAILY_TOOL_CALLS).toBe(300);
    expect(DIRECTORY_DAILY_TOOL_CALLS).toBeLessThan(ASSISTANT_DAILY_TOOL_CALLS);
    const quota = new DailyQuota();
    const base = { bucket: '203.0.113.80', ip: '203.0.113.80', userAgent: 'glama', key: null, keys: noKeys, quota, ranges: OFFICIAL };
    for (let i = 0; i < DIRECTORY_DAILY_TOOL_CALLS; i += 1) expect((await admit({ ...base, body: call(i) })).ok).toBe(true);
    const refused = await admit({ ...base, body: call(999) });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.body.error.message).toContain('300 tool calls per day');
    // A directory name next to an assistant name it cannot back gets the directory quota, not the assistant one.
    expect(isVerifiedAssistant('glama ChatGPT-User/1.0', '203.0.113.80', OFFICIAL)).toBe(false);
    expect(quotaTier(null, 'glama ChatGPT-User/1.0', '203.0.113.80', OFFICIAL)).toBe('directory');
  });

  it('keeps one counter per address: a directory name raises the limit, it does not add calls', async () => {
    const quota = new DailyQuota();
    const base = { bucket: '203.0.113.81', ip: '203.0.113.81', key: null, keys: noKeys, quota, ranges: OFFICIAL };
    for (let i = 0; i < PUBLIC_DAILY_TOOL_CALLS; i += 1) expect((await admit({ ...base, userAgent: 'python-httpx/0.27', body: call(i) })).ok).toBe(true);
    let granted = 0;
    for (let i = 0; i < DIRECTORY_DAILY_TOOL_CALLS; i += 1) if ((await admit({ ...base, userAgent: 'glama', body: call(i) })).ok) granted += 1;
    expect(granted).toBe(DIRECTORY_DAILY_TOOL_CALLS - PUBLIC_DAILY_TOOL_CALLS);
    const refused = await admit({ ...base, userAgent: 'glama', body: call() });
    expect(refused).toMatchObject({ ok: false, tier: 'directory' });
  });

  it("puts a verified Claude-User from Anthropic's IPv6 /48 in the assistants' tier", () => {
    const v6 = new RobotRanges({ fetchedDay: '2026-11-10', lists: { anthropic: { prefixes: ['2607:6bc0::/48'], published: '2026-11-03' } } });
    expect(quotaTier(null, 'Claude-User', '2607:6bc0:0:2a::1', v6)).toBe('assistant');
    expect(quotaTier(null, 'Claude-User', '2001:db8::1', v6)).toBe('public');
    expect(quotaTier({ keyId: 'apk_1', tier: 'pro', dailyQuota: 500 }, 'glama', '2001:db8::1', v6)).toBe('pro');
  });

  it('gives the public quota to assistant names without an official address list', async () => {
    for (const ua of ['OpenAI-MCP/1.0', 'Gemini-User']) {
      expect(isAssistantAgent(ua)).toBe(true);
      expect(isVerifiedAssistant(ua, '203.0.113.90', OFFICIAL)).toBe(false);
      const quota = new DailyQuota();
      let last;
      for (let i = 0; i <= PUBLIC_DAILY_TOOL_CALLS; i += 1) {
        last = await admit({ body: call(i), bucket: '203.0.113.90', ip: '203.0.113.90', userAgent: ua, key: null, keys: noKeys, quota, ranges: OFFICIAL });
      }
      expect(last, ua).toMatchObject({ ok: false });
    }
    // A real Claude-User from Anthropic's addresses keeps the assistants' quota.
    expect(isVerifiedAssistant('Claude-User', '160.79.106.163', OFFICIAL)).toBe(true);
  });

  it('gives the connectors of AI assistants, shared by all their users, the same higher quota', async () => {
    expect(isAssistantAgent('Claude-User')).toBe(true);
    expect(isAssistantAgent('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot')).toBe(true);
    expect(isAssistantAgent('claude-code/2.1.0 (cli)')).toBe(false);
    const quota = new DailyQuota();
    let last;
    for (let i = 0; i <= PUBLIC_DAILY_TOOL_CALLS; i += 1) {
      last = await admit({ body: call(i), bucket: '160.79.106.163', ip: '160.79.106.163', userAgent: 'Claude-User', key: null, keys: noKeys, quota, ranges: OFFICIAL });
    }
    expect(last).toMatchObject({ ok: true, access: 'public' });
  });

  it('does not give the shared quota to a fake ChatGPT-User from an address outside the official list', async () => {
    const quota = new DailyQuota();
    const ua = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot';
    let last;
    for (let i = 0; i <= PUBLIC_DAILY_TOOL_CALLS; i += 1) {
      last = await admit({ body: call(i), bucket: '203.0.113.50', ip: '203.0.113.50', userAgent: ua, key: null, keys: noKeys, quota, ranges: OFFICIAL });
    }
    expect(last).toMatchObject({ ok: false });
    // The real one, from OpenAI's addresses, keeps the shared quota; with no list loaded, the name is not believed.
    const real = await admit({ body: call(), bucket: '13.65.138.113', ip: '13.65.138.113', userAgent: ua, key: null, keys: noKeys, quota: new DailyQuota(), ranges: OFFICIAL });
    expect(real).toMatchObject({ ok: true });
    const fresh = new DailyQuota();
    let unloaded;
    for (let i = 0; i <= PUBLIC_DAILY_TOOL_CALLS; i += 1) {
      unloaded = await admit({ body: call(i), bucket: '13.65.138.113', ip: '13.65.138.113', userAgent: ua, key: null, keys: noKeys, quota: fresh, ranges: null });
    }
    expect(unloaded).toMatchObject({ ok: false });
  });

  it('forgets the smallest counters of a full table instead of refusing newcomers', () => {
    const quota = new DailyQuota(10);
    const now = new Date('2026-11-10T10:00:00Z');
    // A regular visitor with 5 calls, then an address rotation filling the table with one call each.
    for (let i = 0; i < 5; i += 1) quota.take('regular', 100, 1, now);
    for (let i = 0; i < 9; i += 1) expect(quota.take(`rot-${i}`, 100, 1, now).allowed).toBe(true);
    expect(quota.size).toBe(10);
    // A newcomer still gets in; the table stays bounded.
    expect(quota.take('newcomer', 100, 1, now).allowed).toBe(true);
    expect(quota.size).toBe(10);
    // The regular visitor's counter is kept: its quota is not reset by the rotation.
    expect(quota.take('regular', 100, 1, now).used).toBe(6);
    for (let i = 0; i < 1000; i += 1) quota.take(`rot2-${i}`, 100, 1, now);
    expect(quota.size).toBeLessThanOrEqual(10);
    expect(quota.take('regular', 100, 1, now).used).toBe(7);
    // An exhausted bucket stays exhausted.
    const full = new DailyQuota(10);
    for (let i = 0; i < 3; i += 1) full.take('greedy', 3, 1, now);
    for (let i = 0; i < 50; i += 1) full.take(`r-${i}`, 3, 1, now);
    expect(full.take('greedy', 3, 1, now).allowed).toBe(false);
  });

  it('says how long until the quota starts again', () => {
    expect(secondsToUtcMidnight(new Date('2026-10-25T23:59:00Z'))).toBe(60);
  });
});

describe('MCP pro key', () => {
  it('reads the key from Authorization: Bearer or X-Vuntum-Key', () => {
    expect(presentedKey({ authorization: `Bearer ${KEY}` })).toBe(KEY);
    expect(presentedKey({ 'x-vuntum-key': KEY })).toBe(KEY);
    expect(presentedKey({ authorization: 'Basic abc' })).toBeNull();
    expect(presentedKey({})).toBeNull();
  });

  it('logs a prefix only, never the key', () => {
    expect(keyForLog(KEY)).toBe('vtm_aaaaaaaa…');
    expect(keyForLog(KEY)).not.toContain(KEY.slice(12));
  });

  it('lets a live key past the free quota and refuses an unknown or revoked one with 403', async () => {
    const quota = new DailyQuota();
    const keys = { check: async (k: string) => (k === KEY ? { keyId: 'apk_1', tier: 'pro' as const, dailyQuota: 500 } : null) };
    for (let i = 0; i < PUBLIC_DAILY_TOOL_CALLS + 5; i += 1) {
      const pass = await admit({ body: call(i), bucket: '203.0.113.7', userAgent: undefined, key: KEY, keys, quota });
      expect(pass).toMatchObject({ ok: true, access: 'pro' });
    }
    const refused = await admit({ body: call(7), bucket: '203.0.113.7', userAgent: undefined, key: `vtm_${'b'.repeat(43)}`, keys, quota });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.error.status).toBe(403);
      expect(refused.error.body.error.message).toContain('#demande');
    }
  });
});

describe('MCP answer terms', () => {
  it('quotes the robot page and the licence, in both languages', () => {
    expect(attributionFor('https://vuntum.com', 'fr', ['/fr/robots/g1'])).toBe(
      'Source : Vuntum, https://vuntum.com/fr/robots/g1, CC BY-NC 4.0',
    );
    expect(attributionFor('https://vuntum.com', 'en', ['/en/robots/g1'])).toBe(
      'Source: Vuntum, https://vuntum.com/en/robots/g1, CC BY-NC 4.0',
    );
    expect(attributionFor('https://vuntum.com', 'fr')).toBe('Source : Vuntum, https://vuntum.com, CC BY-NC 4.0');
  });

  it('puts attribution and license on every answer, a pro one says commercial use', () => {
    const free = withTerms({ results: [] }, { baseUrl: 'https://vuntum.com', locale: 'fr', access: 'public' });
    expect(free).toMatchObject({ attribution: expect.stringContaining('Vuntum'), license: { commercialUse: false, attributionRequired: true } });
    const pro = withTerms([1, 2], { baseUrl: 'https://vuntum.com', locale: 'en', access: 'pro' });
    expect(pro).toMatchObject({ data: [1, 2], license: { commercialUse: true, name: 'Vuntum Pro' } });
    // A tool's own field cannot replace the terms.
    const shadow = withTerms({ attribution: 'x', license: 'y' }, { baseUrl: 'https://vuntum.com', locale: 'fr', access: 'public' });
    expect(shadow['attribution']).not.toBe('x');
  });
});
