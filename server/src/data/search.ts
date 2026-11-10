import type { SqlClient } from './sql-client.js';

/**
 * Search behind an interface, so Meilisearch can be added later without
 * touching callers. The default provider calls the SQL function
 * `search_site`: PostgreSQL full text in the
 * language asked, accents ignored, prefixes, synonyms, a close spelling when
 * pg_trgm exists, ranked by relevance, over robots, makers and articles
 * (body included). Without the function (a database not yet migrated) it
 * degrades to ILIKE on the names.
 */

export type SearchHitType = 'robot' | 'manufacturer' | 'article';

export interface SearchHit {
  readonly type: SearchHitType;
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** Maker (robot), country code (maker), kind (article). */
  readonly subtitle: string | null;
  /** The summary or standfirst. */
  readonly snippet: string | null;
  readonly rank: number;
  /** 0: every word found; 1: some words only; 2: a close spelling. */
  readonly tier: 0 | 1 | 2;
}

export interface SearchOptions {
  readonly limit?: number;
  readonly locale?: 'fr' | 'en';
  /** Keep only these kinds of result. */
  readonly types?: readonly SearchHitType[];
}

export interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchHit[]>;
}

interface Row {
  kind: SearchHitType;
  id: string;
  slug: string;
  title: string;
  extra: string | null;
  snippet: string | null;
  rank: number | string;
  tier: number;
}

export class PostgresSearchProvider implements SearchProvider {
  private functionAvailable = false;

  constructor(private readonly client: SqlClient) {}

  private async hasFunction(): Promise<boolean> {
    if (this.functionAvailable) return true;
    const rows = await this.client.query<{ ok: boolean }>(
      `SELECT to_regprocedure('search_site(text, text, integer)') IS NOT NULL AS ok`,
    );
    // Only a positive answer is kept: the migration may arrive while we run.
    this.functionAvailable = rows[0]?.ok === true;
    return this.functionAvailable;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchHit[]> {
    const limit = Math.min(options.limit ?? 20, 50);
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const types = options.types?.length ? [...options.types] : null;

    if (await this.hasFunction()) {
      const rows = await this.client.query<Row>(
        `SELECT kind, id, slug, title, extra, snippet, rank, tier
           FROM search_site($1, $2, 100)
          WHERE ($3::text[] IS NULL OR kind = ANY($3::text[]))
          ORDER BY tier, rank DESC, title
          LIMIT $4`,
        [trimmed, options.locale ?? 'fr', types, limit],
      );
      return rows.map((row) => ({
        type: row.kind,
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.extra,
        snippet: row.snippet,
        rank: Number(row.rank),
        tier: row.tier as 0 | 1 | 2,
      }));
    }

    const needle = `%${trimmed}%`;
    const rows = await this.client.query<{
      type: SearchHitType;
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      rank: number | string;
    }>(
      `SELECT * FROM (
         SELECT 'robot' AS type, id, slug, name_usual AS title, manufacturer_name AS subtitle, 0.5 AS rank
           FROM public_robot WHERE name_usual ILIKE $1 OR manufacturer_name ILIKE $1
          UNION ALL
         SELECT 'manufacturer', id, slug, name_usual, country_code, 0.4
           FROM public_manufacturer WHERE name_usual ILIKE $1
          UNION ALL
         SELECT 'article', id, slug, title, standfirst, 0.3
           FROM public_article WHERE title ILIKE $1) s
        WHERE ($2::text[] IS NULL OR type = ANY($2::text[]))
        ORDER BY rank DESC
        LIMIT $3`,
      [needle, types, limit],
    );
    return rows.map((row) => ({
      ...row,
      snippet: null,
      rank: Number(row.rank),
      tier: 0 as const,
    }));
  }
}

export function createSearchProvider(client: SqlClient): SearchProvider {
  return new PostgresSearchProvider(client);
}
