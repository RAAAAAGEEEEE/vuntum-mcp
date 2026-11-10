import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { admit, DailyQuota, KeyChecker, PUBLIC_DAILY_TOOL_CALLS } from './access.js';
import { hashApiKey } from './data/api-keys.js';
import type { SqlClient } from './data/sql-client.js';
import { createSqlReader } from './data/sql-reader.js';
import type { VuntumReader } from './data/reader.js';
import { buildServerCard } from './server-card.js';
import { createMcpServer } from './server.js';
import { createSeededDatabase } from './test-support/database.js';

/**
 * The whole server against the fictitious seed (`sql/schema.sql` + `sql/seed.sql`)
 * in an in-process PostgreSQL: pro keys, the terms of every answer, the
 * pro-only tools, and a call to every tool.
 */

let client: SqlClient;
let data: VuntumReader;

beforeAll(async () => {
  client = await createSeededDatabase();
  data = createSqlReader(client);
});
afterAll(async () => {
  await client?.close();
});

async function answer(access: 'public' | 'pro', name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const server = createMcpServer({ data, baseUrl: 'https://vuntum.com', access });
  const mcp = new Client({ name: 'test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(b), mcp.connect(a)]);
  try {
    const result = (await mcp.callTool({ name, arguments: args })) as { isError?: boolean; content: { type: string; text: string }[] };
    expect(result.isError, `${name}: ${result.content[0]?.text}`).not.toBe(true);
    return JSON.parse(result.content[0]!.text) as Record<string, unknown>;
  } finally {
    await mcp.close();
    await server.close();
  }
}

/** A key as the operator would issue it: random, shown once; only its SHA-256 is stored. */
async function issueKey(id: string, dailyQuota = 1000): Promise<string> {
  const key = `vtm_${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')}`;
  await client.query(
    'INSERT INTO api_key (id, key_hash, key_prefix, holder, daily_quota) VALUES ($1, $2, $3, $4, $5)',
    [id, hashApiKey(key), key.slice(4, 12), 'Test holder', dailyQuota],
  );
  return key;
}

const call = (id: number) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'get_methodology', arguments: {} } });

describe('pro keys', () => {
  it('stores the hash only, never the key', async () => {
    const key = await issueKey('apk_test_hash');
    const stored = JSON.stringify(await client.query('SELECT * FROM api_key WHERE id = $1', ['apk_test_hash']));
    expect(stored).not.toContain(key);
    expect(stored).not.toContain(key.slice(12));
    expect(stored).toContain(hashApiKey(key));
  });

  it('lets a valid key through the free quota, refuses it once revoked', async () => {
    const key = await issueKey('apk_test_revoke');
    expect(await data.lookupApiKey(key)).toMatchObject({ keyId: 'apk_test_revoke', tier: 'pro', dailyQuota: 1000 });
    const quota = new DailyQuota();
    const keys = new KeyChecker(data, 0);
    for (let i = 0; i <= PUBLIC_DAILY_TOOL_CALLS; i += 1) {
      const pass = await admit({ body: call(i), bucket: '203.0.113.1', userAgent: undefined, key, keys, quota });
      expect(pass).toMatchObject({ ok: true, access: 'pro' });
    }
    await client.query('UPDATE api_key SET revoked_at = now() WHERE id = $1', ['apk_test_revoke']);
    expect(await data.lookupApiKey(key)).toBeNull();
    const refused = await admit({ body: call(1), bucket: '203.0.113.1', userAgent: undefined, key, keys, quota });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.status).toBe(403);
  });

  it('refuses a key of the right shape that was never issued, and anything else without a query', async () => {
    expect(await data.lookupApiKey(`vtm_${'z'.repeat(43)}`)).toBeNull();
    expect(await data.lookupApiKey('not-a-key')).toBeNull();
  });
});

describe('terms of every MCP answer', () => {
  it('a free answer carries the attribution of the robot page and the non-commercial licence', async () => {
    const robot = await answer('public', 'get_robot', { slug: 'demo-robot-a' });
    expect(robot['attribution']).toBe('Source : Vuntum, https://vuntum.com/fr/robots/demo-robot-a, CC BY-NC 4.0');
    expect(robot['license']).toMatchObject({ name: 'CC BY-NC 4.0', attributionRequired: true, commercialUse: false });
    const en = await answer('public', 'get_robot_prices', { slug: 'demo-robot-a', locale: 'en' });
    expect(en['attribution']).toBe('Source: Vuntum, https://vuntum.com/en/robots/demo-robot-a, CC BY-NC 4.0');
    const changes = await answer('public', 'get_recent_changes', {});
    expect(changes['attribution']).toBe('Source : Vuntum, https://vuntum.com, CC BY-NC 4.0');
    const methodology = await answer('public', 'get_methodology', {});
    expect(methodology['attribution']).toMatch(/^Source : Vuntum/);
  });

  it('a pro answer carries the attribution too, and the commercial licence', async () => {
    const pro = await answer('pro', 'compare_robots', { slugs: ['demo-robot-a', 'demo-robot-b'] });
    expect(pro['attribution']).toBe(
      'Source : Vuntum, https://vuntum.com/fr/robots/demo-robot-a, https://vuntum.com/fr/robots/demo-robot-b, CC BY-NC 4.0',
    );
    expect(pro['license']).toMatchObject({ name: 'Vuntum Pro', commercialUse: true });
    expect(pro['differingPredicates']).toEqual(expect.arrayContaining(['dimensions.height', 'mass.weight']));
  });

  it('every tool of the server answers through the terms, and the HTTP server never logs a key', () => {
    const server = readFileSync(new URL('./server.ts', import.meta.url), 'utf8');
    const tools = server.match(/server\.registerTool\(/g)?.length ?? 0;
    const wrapped = server.match(/async \(args\) =>\s*json\(/g)?.length ?? 0;
    expect(tools).toBeGreaterThan(10);
    expect(wrapped).toBe(tools);
    const http = readFileSync(new URL('./server-http.ts', import.meta.url), 'utf8');
    for (const line of http.split('\n').filter((l) => /log\.(info|warn|error|debug)\(/.test(l))) {
      // A key may reach a log through `keyForLog` (its prefix) only.
      expect(line.replace(/keyForLog\(key\)/g, ''), line).not.toMatch(/[{,(]\s*key\s*[,})]|req\.headers|authorization/i);
    }
  });
});

describe('pro-only tools', () => {
  it('get_change_history refuses the free access politely with the pro link, serves the pro key with filters', async () => {
    const free = await answer('public', 'get_change_history', {});
    expect(free['error']).toBe('pro_key_required');
    expect(String(free['message'])).toContain('/entreprise#demande');
    expect(free['changes']).toBeUndefined();

    const pro = await answer('pro', 'get_change_history', { limit: 200 });
    expect(pro['total']).toBe(4);
    expect(pro['license']).toMatchObject({ commercialUse: true });
    const robot = await answer('pro', 'get_change_history', { slug: 'demo-robot-a', kinds: ['price_changed'], locale: 'en' });
    expect(robot['changes']).toEqual([expect.objectContaining({ kind: 'price_changed', summary: 'Price updated' })]);
    expect((await answer('pro', 'get_change_history', { from: '2999-01-01' }))['total']).toBe(0);
    expect((await answer('pro', 'get_change_history', { slug: 'no-such-robot-xyz' }))['error']).toBe('robot_not_found');
  });

  it('get_fact_sources lists every accepted observation for a pro key, replaced ones included', async () => {
    const free = await answer('public', 'get_fact_sources', { slug: 'demo-robot-a' });
    expect(free['error']).toBe('pro_key_required');
    expect(free['facts']).toBeUndefined();

    const pro = await answer('pro', 'get_fact_sources', { slug: 'demo-robot-a' });
    const facts = pro['facts'] as Array<{ predicate: string; sourceCount: number; observations: Array<{ claimId: string; status: string }> }>;
    expect(facts).toHaveLength(1);
    expect(facts[0]!.predicate).toBe('mass.weight');
    expect(facts[0]!.sourceCount).toBe(2);
    expect(facts[0]!.observations.map((o) => [o.claimId, o.status]).sort()).toEqual([
      ['clm_demo_a_weight', 'active'],
      ['clm_demo_a_weight_old', 'superseded'],
    ]);
    expect((await answer('pro', 'get_fact_sources', { slug: 'demo-robot-a', predicate: 'price.msrp' }))['facts']).toEqual([]);
    expect((await answer('pro', 'get_fact_sources', { slug: 'no-such-robot-xyz' }))['found']).toBe(false);
  });
});

describe('the tools on the fictitious seed', () => {
  it('search_robots ranks every word found first, and says so', async () => {
    const result = await answer('public', 'search_robots', { query: 'demo robot' });
    expect(result['matchQuality']).toBe('all_words');
    expect(result['totalMatches']).toBe(3);
    const one = await answer('public', 'search_robots', { query: 'Demo Robot A', limit: 1 });
    expect((one['results'] as Array<{ slug: string }>)[0]!.slug).toBe('demo-robot-a');
  });

  it('get_robot gives the facts with level of evidence, source and an untrusted quote', async () => {
    const result = await answer('public', 'get_robot', { slug: 'demo-robot-a', locale: 'en' });
    const robot = result['robot'] as Record<string, unknown>;
    expect(robot['name']).toBe('Demo Robot A');
    expect(robot['url']).toBe('https://vuntum.com/en/robots/demo-robot-a');
    const facts = result['facts'] as Array<Record<string, unknown>>;
    const weight = facts.find((f) => f['predicate'] === 'mass.weight')!;
    expect(weight).toMatchObject({ evidenceLevel: 'manufacturer_claim', isManufacturerStatement: true });
    expect(weight['untrustedSourceQuote']).toMatchObject({ text: 'It weighs 35 kg.' });
    expect(result['identifiers']).toEqual([expect.objectContaining({ kind: 'mpn', value: 'DEMO-A-0001' })]);
    expect(result['components']).toEqual([expect.objectContaining({ company: 'Example Motors', component: 'motor' })]);
    expect((await answer('public', 'get_robot', { slug: 'missing' }))['found']).toBe(false);
  });

  it('get_humanoid_tracker keeps humanoids only, at their furthest dated stage', async () => {
    const result = await answer('public', 'get_humanoid_tracker', { locale: 'en' });
    const rows = result['humanoids'] as Array<{ furthestStage: string; robot: { slug: string } }>;
    expect(rows.map((r) => [r.robot.slug, r.furthestStage]).sort()).toEqual([
      ['demo-robot-a', 'on_sale'],
      ['demo-robot-b', 'preorder'],
    ]);
  });

  it('answers every tool without an error', async () => {
    const calls: Array<[string, Record<string, unknown>]> = [
      ['get_methodology', { locale: 'en' }],
      ['get_editorial_scope', {}],
      ['search_site', { query: 'demo', types: ['robot', 'article'] }],
      ['get_article', { slug: 'demo-robot-a-on-sale', locale: 'en' }],
      ['get_robot_claims', { slug: 'demo-robot-a' }],
      ['get_robot_sources', { slug: 'demo-robot-a' }],
      ['get_robot_availability', { slug: 'demo-robot-b' }],
      ['find_home_robots', {}],
      ['find_robots_by_utility', { utility: 'recherche', locale: 'en' }],
      ['find_robots_by_capability', { capabilities: ['marcher'] }],
      ['find_programmable_robots', {}],
      ['search_open_source_projects', { query: 'sdk' }],
    ];
    const out = Object.fromEntries(await Promise.all(calls.map(async ([name, args]) => [name, await answer('public', name, args)] as const)));
    expect((out['get_article']!['article'] as { title: string }).title).toContain('fictitious');
    expect(out['get_robot_sources']!['sources']).toHaveLength(2);
    expect(out['find_home_robots']!['robots']).toHaveLength(2);
    expect((out['find_robots_by_utility']!['robots'] as unknown[]).length).toBe(2);
    expect(out['find_robots_by_capability']!['robots']).toHaveLength(2);
    expect(out['find_programmable_robots']!['robots']).toEqual([expect.objectContaining({ slug: 'demo-robot-a' })]);
    expect(out['search_open_source_projects']!['projects']).toEqual([expect.objectContaining({ repository: 'example/demo-robot-sdk' })]);
    for (const [name, body] of Object.entries(out)) expect(body['attribution'], name).toMatch(/^Source/);
  });

  it('the server card lists every registered tool, read-only', async () => {
    const card = await buildServerCard();
    const server = readFileSync(new URL('./server.ts', import.meta.url), 'utf8');
    expect(card.tools).toHaveLength(server.match(/server\.registerTool\(/g)?.length ?? 0);
    for (const tool of card.tools) expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
  });
});

describe('the seed is fictitious', () => {
  it('every address of the seed is on example.com, every robot is a "Demo Robot"', () => {
    const seed = readFileSync(new URL('../sql/seed.sql', import.meta.url), 'utf8');
    const urls = seed.match(/https?:\/\/[^\s'"]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(5);
    for (const url of urls.filter((u) => !u.startsWith('https://vuntum.com/mcp'))) expect(new URL(url).hostname).toBe('example.com');
    expect(seed.match(/'Demo Robot [ABC]'/g)).toHaveLength(3);
  });
});
