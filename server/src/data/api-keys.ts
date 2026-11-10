import { createHash } from 'node:crypto';
import type { SqlClient } from './sql-client.js';

/**
 * Pro access keys of the MCP server.
 * The key is shown once, when it is created; the database keeps its SHA-256
 * only, and the logs never see more than the key's prefix.
 */

export const API_KEY_PATTERN = /^vtm_[A-Za-z0-9_-]{43}$/;

export interface ApiKeyGrant {
  readonly keyId: string;
  readonly tier: 'pro';
  readonly dailyQuota: number;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

/** The part of a key that may be shown and logged: `vtm_` and its first eight characters. */
export function apiKeyPrefix(key: string): string {
  return key.slice(4, 12);
}

/**
 * What a presented key grants, or null for an unknown or revoked key. Reads
 * through `public_api_key_lookup` (see `sql/schema.sql`), the only access the
 * read-only role has to the keys: it never sees the table itself.
 */
export async function lookupApiKey(client: SqlClient, key: string): Promise<ApiKeyGrant | null> {
  if (!API_KEY_PATTERN.test(key)) return null;
  const rows = await client.query<{ key_id: string; tier: string; daily_quota: number }>(
    'SELECT key_id, tier, daily_quota FROM public_api_key_lookup($1)',
    [hashApiKey(key)],
  );
  const row = rows[0];
  if (!row || row.tier !== 'pro') return null;
  return { keyId: row.key_id, tier: 'pro', dailyQuota: Number(row.daily_quota) };
}

/** The key sent with a request, if any. Never logged: see `apiKeyPrefix`. */
export function presentedApiKey(headers: Record<string, string | string[] | undefined>): string | null {
  const one = (name: string): string | undefined => {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const bearer = /^Bearer\s+(\S+)\s*$/i.exec(one('authorization') ?? '')?.[1];
  const key = (bearer ?? one('x-vuntum-key') ?? '').trim();
  return key === '' ? null : key;
}

/**
 * Calls counted per bucket and per UTC day. In memory: a restart starts the day again, in the caller's favour.
 *
 * A full table (someone rotating addresses) no longer refuses every newcomer until midnight UTC
 * (security review): the smallest counters, a tenth of the table, are
 * forgotten instead. Rotating addresses creates counters of one or two calls, so those are the
 * ones that go; a regular visitor's counter, larger, stays. A forgotten counter only starts its
 * day again, in the caller's favour, as a restart does.
 */
export class DailyQuota {
  private readonly counts = new Map<string, number>();
  private day = '';

  constructor(private readonly maxBuckets = 100_000) {}

  take(bucket: string, limit: number, calls: number, now = new Date()): { allowed: boolean; used: number } {
    const today = now.toISOString().slice(0, 10);
    if (today !== this.day) {
      this.counts.clear();
      this.day = today;
    }
    const used = this.counts.get(bucket) ?? 0;
    if (used + calls > limit) return { allowed: false, used };
    if (used === 0 && this.counts.size >= this.maxBuckets) this.forgetSmallest();
    this.counts.set(bucket, used + calls);
    return { allowed: true, used: used + calls };
  }

  /** Counters kept today (tests, logs). */
  get size(): number {
    return this.counts.size;
  }

  private forgetSmallest(): void {
    const drop = Math.max(1, Math.floor(this.maxBuckets / 10));
    // Stable sort: among equal counters, the oldest go first.
    const smallest = [...this.counts].sort((a, b) => a[1] - b[1]).slice(0, drop);
    for (const [bucket] of smallest) this.counts.delete(bucket);
  }
}

export function secondsToUtcMidnight(now = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

/**
 * Key checks cached for a minute, by hash (the key itself is not kept): a
 * revoked key stops working within a minute, and a client cannot make the
 * server query the database on every request.
 */
export class KeyChecker {
  private readonly cache = new Map<string, { grant: ApiKeyGrant | null; until: number }>();

  constructor(
    private readonly reader: { lookupApiKey(key: string): Promise<ApiKeyGrant | null> },
    private readonly ttlMs = 60_000,
  ) {}

  async check(key: string, now = Date.now()): Promise<ApiKeyGrant | null> {
    const hash = hashApiKey(key);
    const cached = this.cache.get(hash);
    if (cached && cached.until > now) return cached.grant;
    if (this.cache.size > 10_000) this.cache.clear();
    const grant = await this.reader.lookupApiKey(key);
    this.cache.set(hash, { grant, until: now + this.ttlMs });
    return grant;
  }
}
