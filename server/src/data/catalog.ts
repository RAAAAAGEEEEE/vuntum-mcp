import { deriveBadges, type BadgeFactInput } from '../domain/badges.js';
import { deriveRealityLevel } from '../domain/reality.js';
import { deriveVerificationStatus, type CommercialStatus, type EvidenceLevel, type LifecycleStatus, type Locale, type RobotSegment } from '../domain/enums.js';
import { findPredicate } from '../domain/predicates.js';
import { isStale } from '../domain/claim.js';
import { parseUtilities, type RobotUtility } from '../domain/utilities.js';
import { renderValue, type ClaimValue } from '../domain/claim-value.js';
import type { Fact, RobotDetail, RobotSummary, SourceRef } from '../domain/api.js';
import type { RobotCapability } from '../domain/capabilities.js';
import { sourceDisplayName } from '../domain/source-name.js';
import { containsFrench } from '../domain/french-in-english.js';
import { distinctFactCount } from '../domain/fact-count.js';
import { type SqlClient, queryOne } from './sql-client.js';
import { buildSpecGroups, type SpecClaimRow } from './specs.js';

/**
 * The public read model.
 *
 * Every function here reads `public_*` views only, so unpublished work and
 * sample data cannot leak to the site, the API or the MCP server.
 * Staleness and badges are computed from the predicate registry, which stays the
 * single source of truth for freshness.
 */

export interface PublicRobotRow {
  id: string;
  slug: string;
  manufacturer_id: string;
  manufacturer_slug: string;
  manufacturer_name: string;
  name_usual: string;
  name_native: string | null;
  /** Estimated translation of the name, shown as unofficial. */
  name_gloss_fr?: string | null;
  name_gloss_en?: string | null;
  aliases: string[];
  category_slug: string | null;
  commercial_status: CommercialStatus;
  announced_year: number | null;
  summary_fr: string | null;
  summary_en: string | null;
  last_verified_at: string | null;
  published_at: string | null;
  updated_at: string;
  /** Appended to the view by migration 0017. */
  segment: RobotSegment | null;
  /** Appended by migration 0050; absent on a database not yet migrated. */
  utilities?: string[] | null;
  /** Appended by migration 0062; absent on a database not yet migrated. */
  sheet_level?: 'full' | 'light' | null;
  light_source_url?: string | null;
  light_source_name?: string | null;
  light_source_kind?: 'manufacturer' | 'press' | null;
  light_checked_at?: string | null;
  manufacturer_country?: string | null;
}

export interface PublicFactRow {
  claim_id: string;
  subject_type: string;
  subject_id: string;
  robot_id: string | null;
  robot_variant_id: string | null;
  predicate: string;
  value: ClaimValue;
  qualifiers: Record<string, string>;
  evidence_level: EvidenceLevel;
  lifecycle_status: LifecycleStatus;
  confidence: string | number;
  quote_original: string;
  quote_translated: string | null;
  language: string;
  source_published_at: string | null;
  source_date_precision: 'day' | 'month' | 'year' | 'unknown';
  accessed_at: string;
  last_verified_at: string;
  source_id: string;
  source_name: string;
  source_url: string | null;
  source_is_official: boolean;
  /** The exact page read; absent on a database not yet migrated. */
  source_page_url?: string | null;
  /** The conditions in English; null until written. */
  qualifiers_en?: Record<string, string> | null;
}

/** Free-text qualifiers read by people, in French in `qualifiers` (0035). */
const READER_QUALIFIERS = ['conditions', 'configuration'];

/**
 * The qualifiers in the reader's language. In English, the French
 * conditions give way to their English text; while it is not written yet
 * they are left out rather than shown in French on an English page.
 */
export function qualifiersFor(
  row: Pick<PublicFactRow, 'qualifiers' | 'qualifiers_en'>,
  locale: Locale,
): Record<string, string> {
  const qualifiers = { ...(row.qualifiers ?? {}) };
  if (locale === 'fr') return qualifiers;
  for (const key of READER_QUALIFIERS) {
    const english = row.qualifiers_en?.[key];
    // A text stored before the write guard may still be French: never shown on /en.
    if (typeof english === 'string' && english.trim() && !containsFrench(english)) qualifiers[key] = english;
    else delete qualifiers[key];
  }
  return qualifiers;
}

export interface CatalogOptions {
  readonly locale?: Locale;
  readonly baseUrl?: string;
  readonly now?: Date;
  /** Include the verbatim source quote. Off for list endpoints. */
  readonly includeQuotes?: boolean;
}

export function toFact(row: PublicFactRow, options: CatalogOptions = {}): Fact {
  const locale = options.locale ?? 'fr';
  const predicate = findPredicate(row.predicate);
  const stale = predicate ? isStale(row.predicate, row.last_verified_at, options.now) : false;

  const source: SourceRef = {
    id: row.source_id,
    name: sourceDisplayName(row.source_name, locale),
    ...(row.source_url ? { url: row.source_url } : {}),
    ...(row.source_page_url ? { pageUrl: row.source_page_url } : {}),
    isOfficial: row.source_is_official,
    publishedAt: row.source_published_at,
    datePrecision: row.source_date_precision,
    accessedAt: row.accessed_at,
  };

  const fact: Fact = {
    claimId: row.claim_id,
    predicate: row.predicate,
    label: predicate ? predicate.labels[locale] : row.predicate,
    value: row.value,
    display: renderValue(row.value, locale),
    qualifiers: qualifiersFor(row, locale),
    evidenceLevel: row.evidence_level,
    verificationStatus: deriveVerificationStatus(row.evidence_level, row.lifecycle_status),
    confidence: Number(row.confidence),
    stale,
    lastVerifiedAt: row.last_verified_at,
    source,
  };

  if (options.includeQuotes) {
    return {
      ...fact,
      quote: {
        original: row.quote_original,
        translated: row.quote_translated,
        language: row.language,
        // Third-party text. Consumers, including AI agents, must not follow it.
        untrusted: true as const,
      },
    };
  }
  return fact;
}

// ------------------------------------------------- one value per characteristic

/** A retained claim and the claims grouped under it. */
export interface RetainedFactRow {
  readonly row: PublicFactRow;
  /** Other claims that give the same value: their sources, grouped. */
  readonly agreeing: PublicFactRow[];
  /** Claims of the same version and market that give another value. */
  readonly differing: PublicFactRow[];
}

const EVIDENCE_RANK: Record<string, number> = {
  vuntum_tested: 5,
  independently_tested: 4,
  independently_reported: 3,
  manufacturer_demo: 2,
  manufacturer_claim: 1,
};

/** Official first, then the strongest evidence, then the latest reading. */
function strongestFirst(a: PublicFactRow, b: PublicFactRow): number {
  return (
    Number(b.source_is_official) - Number(a.source_is_official) ||
    (EVIDENCE_RANK[b.evidence_level] ?? 0) - (EVIDENCE_RANK[a.evidence_level] ?? 0) ||
    new Date(b.accessed_at).getTime() - new Date(a.accessed_at).getTime() ||
    (a.claim_id < b.claim_id ? -1 : 1)
  );
}

/**
 * One value per criterion, version and market (ADR-029 rule, ADR-031 for the
 * sheet, the API and the JSON-LD). The claims are grouped by
 * `buildSpecGroups`, the rule `robot_spec` is computed with: the value an
 * official source gives, else the one most sources give, else the latest.
 * Inside the retained group, the claim shown is the official one, then the
 * strongest evidence. A tester's measurement (`measured_by`) is never folded
 * into an announced value: it stays a characteristic of its own.
 */
export function retainFacts(rows: readonly PublicFactRow[], names: readonly string[]): RetainedFactRow[] {
  const byId = new Map(rows.map((row) => [row.claim_id, row]));
  const grouped: PublicFactRow[] = [];
  const alone: PublicFactRow[] = [];
  for (const row of rows) {
    if (row.qualifiers?.['measured_by'] || !findPredicate(row.predicate)) alone.push(row);
    else grouped.push(row);
  }
  const specRows: SpecClaimRow[] = grouped.map((row) => ({
    id: row.claim_id,
    predicate: row.predicate,
    value: row.value,
    qualifiers: row.qualifiers ?? {},
    source_id: row.source_id,
    source_is_official: row.source_is_official,
    created_at: row.accessed_at,
    updated_at: row.last_verified_at,
    robot_variant_id: row.robot_variant_id,
  }));
  const out: RetainedFactRow[] = [];
  for (const group of buildSpecGroups(specRows, names)) {
    const [first, ...rest] = group.values;
    if (!first) continue;
    const members = first.claimIds
      .map((id) => byId.get(id))
      .filter((row): row is PublicFactRow => Boolean(row))
      .sort(strongestFirst);
    const [shown, ...agreeing] = members;
    if (!shown) continue;
    const differing = rest
      .flatMap((value) => value.claimIds.map((id) => byId.get(id)))
      .filter((row): row is PublicFactRow => Boolean(row))
      .sort(strongestFirst);
    out.push({ row: shown, agreeing, differing });
  }
  for (const row of alone) out.push({ row, agreeing: [], differing: [] });
  return out.sort((a, b) => (a.row.predicate < b.row.predicate ? -1 : a.row.predicate > b.row.predicate ? 1 : 0));
}

function toRetainedFact(item: RetainedFactRow, options: CatalogOptions): Fact {
  return {
    ...toFact(item.row, options),
    ...(item.agreeing.length > 0 ? { corroboration: item.agreeing.map((row) => toFact(row, options)) } : {}),
    ...(item.differing.length > 0 ? { otherValues: item.differing.map((row) => toFact(row, options)) } : {}),
  };
}

function badgeInputs(facts: PublicFactRow[], options: CatalogOptions): BadgeFactInput[] {
  return facts.map((row) => {
    const predicate = findPredicate(row.predicate);
    const simpleValue =
      row.value.kind === 'tristate' || row.value.kind === 'enum' ? row.value.value : undefined;
    return {
      predicate: row.predicate,
      evidenceLevel: row.evidence_level,
      lifecycleStatus: row.lifecycle_status,
      stale: predicate ? isStale(row.predicate, row.last_verified_at, options.now) : false,
      sourceIsOfficial: row.source_is_official,
      market: row.qualifiers?.['market'],
      simpleValue,
    };
  });
}

function robotUrl(slug: string, options: CatalogOptions): string {
  const base = options.baseUrl ?? 'https://vuntum.com';
  return `${base}/${options.locale === 'en' ? 'en' : 'fr'}/robots/${slug}`;
}

export function toRobotSummary(
  row: PublicRobotRow,
  facts: PublicFactRow[],
  options: CatalogOptions = {},
): RobotSummary {
  const locale = options.locale ?? 'fr';
  const reality = deriveRealityLevel({
    commercialStatus: row.commercial_status,
    facts: badgeInputs(facts, options),
  });
  return {
    id: row.id,
    slug: row.slug,
    name: row.name_usual,
    nativeName: row.name_native,
    nameGloss: (locale === 'en' ? row.name_gloss_en : row.name_gloss_fr) ?? null,
    manufacturer: {
      id: row.manufacturer_id,
      slug: row.manufacturer_slug,
      name: row.manufacturer_name,
    },
    category: row.category_slug,
    segment: row.segment,
    utilities: parseUtilities(row.utilities),
    commercialStatus: row.commercial_status,
    announcedYear: row.announced_year,
    summary: locale === 'fr' ? row.summary_fr : row.summary_en,
    badges: [
      ...deriveBadges({
        isSample: false,
        commercialStatus: row.commercial_status,
        facts: badgeInputs(facts, options),
      }),
      // ADR-034: a light sheet says so on every card.
      ...(row.sheet_level === 'light' && row.light_source_url ? ['light_sheet'] : []),
    ],
    realityLevel: reality?.level ?? null,
    realityBasis: reality?.basis ?? null,
    url: robotUrl(row.slug, options),
    lastVerifiedAt: row.last_verified_at,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    ...lightSheetFields(row, locale),
  };
}

/**
 * A light sheet says so wherever the robot is read: its level, the
 * one page that names it, and the maker's country when the catalogue has it.
 */
function lightSheetFields(row: PublicRobotRow, locale: Locale = 'fr'): Pick<RobotSummary, 'sheetLevel' | 'lightSource' | 'manufacturerCountry'> {
  const light = row.sheet_level === 'light' && Boolean(row.light_source_url);
  return {
    sheetLevel: light ? 'light' : 'full',
    lightSource:
      light && row.light_source_url
        ? {
            url: row.light_source_url,
            name: row.light_source_name ? sourceDisplayName(row.light_source_name, locale) : null,
            kind: row.light_source_kind === 'press' ? 'press' : 'manufacturer',
            checkedAt: row.light_checked_at ?? null,
          }
        : null,
    manufacturerCountry: row.manufacturer_country ?? null,
  };
}

const FACT_SELECT = `
  SELECT * FROM public_fact
   WHERE robot_id = $1 OR (subject_type = 'robot' AND subject_id = $1)
   ORDER BY predicate`;

export async function getRobotFacts(client: SqlClient, robotId: string): Promise<PublicFactRow[]> {
  return client.query<PublicFactRow>(FACT_SELECT, [robotId]);
}

/**
 * The facts of several robots in one query (a page of 100 robots used to cost
 * 100 queries), each list in the order `getRobotFacts` gives.
 */
export async function getRobotsFacts(
  client: SqlClient,
  robotIds: readonly string[],
): Promise<Map<string, PublicFactRow[]>> {
  const out = new Map<string, PublicFactRow[]>();
  if (robotIds.length === 0) return out;
  const wanted = new Set(robotIds);
  const rows = await client.query<PublicFactRow>(
    `SELECT * FROM public_fact
      WHERE robot_id = ANY($1::text[]) OR (subject_type = 'robot' AND subject_id = ANY($1::text[]))
      ORDER BY predicate`,
    [robotIds],
  );
  for (const row of rows) {
    const owners = new Set<string>();
    if (row.robot_id && wanted.has(row.robot_id)) owners.add(row.robot_id);
    if (row.subject_type === 'robot' && row.subject_id && wanted.has(row.subject_id))
      owners.add(row.subject_id);
    for (const id of owners) out.set(id, [...(out.get(id) ?? []), row]);
  }
  return out;
}

export async function getPublicRobotBySlug(
  client: SqlClient,
  slug: string,
  options: CatalogOptions = {},
): Promise<RobotDetail | null> {
  const row = await queryOne<PublicRobotRow>(client, 'SELECT * FROM public_robot WHERE slug = $1', [
    slug,
  ]);
  if (!row) return null;
  return buildRobotDetail(client, row, options);
}

interface VariantRow {
  id: string;
  slug: string;
  name: string;
  differences_fr: string | null;
  robot_id?: string;
}

async function buildRobotDetail(
  client: SqlClient,
  row: PublicRobotRow,
  options: CatalogOptions,
  prefetched?: { facts: PublicFactRow[]; variants: VariantRow[] },
): Promise<RobotDetail> {
  const facts = prefetched?.facts ?? (await getRobotFacts(client, row.id));
  const variants =
    prefetched?.variants ??
    (await client.query<VariantRow>(
      'SELECT id, slug, name, differences_fr FROM public_robot_variant WHERE robot_id = $1',
      [row.id],
    ));

  const withQuotes: CatalogOptions = { ...options, includeQuotes: options.includeQuotes ?? true };
  const isPrice = (f: PublicFactRow): boolean => f.value.kind === 'money';
  const isAvailability = (f: PublicFactRow): boolean => f.predicate.startsWith('availability.');

  const sources = new Map<string, SourceRef>();
  for (const f of facts) {
    // One entry per source: the most recent access wins, whatever the row order.
    const seen = sources.get(f.source_id);
    if (seen && new Date(seen.accessedAt) >= new Date(f.accessed_at)) continue;
    sources.set(f.source_id, {
      id: f.source_id,
      name: sourceDisplayName(f.source_name, options.locale ?? 'fr'),
      ...(f.source_url ? { url: f.source_url } : {}),
      isOfficial: f.source_is_official,
      publishedAt: f.source_published_at,
      datePrecision: f.source_date_precision,
      accessedAt: f.accessed_at,
    });
  }

  // One value per characteristic, its sources grouped under it.
  const names = [row.name_usual, row.manufacturer_name, ...(Array.isArray(row.aliases) ? row.aliases : [])];
  const retained = retainFacts(facts, names);
  const pick = (keep: (f: PublicFactRow) => boolean): Fact[] =>
    retained.filter((item) => keep(item.row)).map((item) => toRetainedFact(item, withQuotes));

  return {
    ...toRobotSummary(row, facts, options),
    facts: pick((f) => !isPrice(f) && !isAvailability(f)),
    prices: pick(isPrice),
    availability: pick(isAvailability),
    sources: [...sources.values()],
    variants: variants.map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      differences: v.differences_fr,
    })),
    factCount: facts.length,
    distinctFactCount: distinctFactCount(facts),
  };
}

export interface ListRobotsFilters {
  readonly manufacturerSlug?: string;
  readonly category?: string;
  readonly segment?: RobotSegment;
  /** A utility of ADR-027: the robots that have it among theirs. */
  readonly utility?: RobotUtility;
  /** Demonstrated capabilities: the robots that have all of them, each tied to an accepted claim. */
  readonly capabilities?: readonly RobotCapability[];
  readonly status?: CommercialStatus;
  readonly search?: string;
  /** Only the robots meeting the "programmable" rule (ADR-020, view public_robot_programmability). */
  readonly programmable?: boolean;
  readonly limit?: number;
  readonly cursor?: string;
  /**
   * `price_asc` and `price_desc` order by the lowest official price (`msrp`)
   * in `market`, in that market's own currency; robots with no such price come
   * last. They need `market`.
   */
  readonly sort?: 'name' | 'recent' | 'price_asc' | 'price_desc';
  readonly market?: string;
}

export interface ListRobotsResult {
  readonly robots: RobotSummary[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
  /** Robots matching the filters, whatever the page. */
  readonly total: number;
}

export async function listPublicRobots(
  client: SqlClient,
  filters: ListRobotsFilters = {},
  options: CatalogOptions = {},
): Promise<ListRobotsResult> {
  const limit = Math.min(filters.limit ?? 20, 100);
  const conditions: string[] = ['1 = 1'];
  const params: unknown[] = [];
  const push = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.manufacturerSlug)
    conditions.push(`manufacturer_slug = ${push(filters.manufacturerSlug)}`);
  if (filters.category) conditions.push(`category_slug = ${push(filters.category)}`);
  if (filters.segment) conditions.push(`segment = ${push(filters.segment)}`);
  if (filters.utility) conditions.push(`utilities @> ARRAY[${push(filters.utility)}]::text[]`);
  for (const capability of filters.capabilities ?? []) {
    conditions.push(
      `EXISTS (SELECT 1 FROM public_robot_capability pc
                WHERE pc.robot_id = id AND pc.capability = ${push(capability)})`,
    );
  }
  if (filters.status) conditions.push(`commercial_status = ${push(filters.status)}`);
  if (filters.programmable !== undefined) {
    conditions.push(
      `${filters.programmable ? '' : 'NOT '}EXISTS (SELECT 1 FROM public_robot_programmability pp
         WHERE pp.robot_id = public_robot.id AND pp.is_programmable)`,
    );
  }
  if (filters.search) {
    const needle = push(`%${filters.search}%`);
    const text = push(filters.search);
    const language = push(options.locale === 'en' ? 'en' : 'fr');
    // The name as typed, or what the site search finds.
    conditions.push(
      `(name_usual ILIKE ${needle} OR manufacturer_name ILIKE ${needle}
        OR id IN (SELECT id FROM search_site(${text}, ${language}, 100) WHERE kind = 'robot'))`,
    );
  }
  const sort = filters.sort ?? 'name';
  const byPrice = sort === 'price_asc' || sort === 'price_desc';
  if (byPrice && !filters.market) throw new Error('A price sort needs a market.');
  // The sort key is unique thanks to the id (keyset pagination).
  const source = byPrice
    ? `(SELECT r.*, (SELECT min(p.amount) FROM public_price p
                      WHERE p.robot_id = r.id AND p.market = ${push(filters.market)}
                        AND p.price_type = 'msrp') AS sort_price
          FROM public_robot r) public_robot`
    : 'public_robot';
  const orderBy =
    sort === 'recent'
      ? 'published_at DESC NULLS LAST, id DESC'
      : sort === 'price_asc'
        ? 'sort_price ASC NULLS LAST, id ASC'
        : sort === 'price_desc'
          ? 'sort_price DESC NULLS LAST, id ASC'
          : 'name_usual ASC, id ASC';
  const filterParams = params.length;
  const total = Number(
    (
      await client.query<{ n: string | number }>(
        `SELECT count(*) AS n FROM ${source} WHERE ${conditions.join(' AND ')}`,
        params.slice(0, filterParams),
      )
    )[0]?.n ?? 0,
  );
  if (filters.cursor) {
    const decoded = decodeCursor(filters.cursor);
    if (!decoded || !cursorFits(decoded.sortValue, sort)) throw new InvalidCursorError();
    {
      if (sort === 'recent') {
        conditions.push(
          `(published_at, id) < (${push(decoded.sortValue)}::timestamptz, ${push(decoded.id)})`,
        );
      } else if (byPrice) {
        const compare = sort === 'price_asc' ? '>' : '<';
        const id = push(decoded.id);
        if (decoded.sortValue === '') {
          conditions.push(`(sort_price IS NULL AND id > ${id})`);
        } else {
          const price = push(decoded.sortValue);
          conditions.push(
            `(sort_price ${compare} ${price}::numeric
              OR (sort_price = ${price}::numeric AND id > ${id}) OR sort_price IS NULL)`,
          );
        }
      } else {
        conditions.push(`(name_usual, id) > (${push(decoded.sortValue)}, ${push(decoded.id)})`);
      }
    }
  }

  const rows = await client.query<PublicRobotRow & { sort_price?: string | null }>(
    `SELECT * FROM ${source} WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy} LIMIT ${push(limit + 1)}`,
    params,
  );

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const factsOf = await getRobotsFacts(
    client,
    page.map((row) => row.id),
  );
  const robots: RobotSummary[] = page.map((row) =>
    toRobotSummary(row, factsOf.get(row.id) ?? [], options),
  );

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          id: last.id,
          sortValue:
            sort === 'recent'
              ? (last.published_at ?? last.updated_at)
              : byPrice
                ? (((last as { sort_price?: string | null }).sort_price) ?? '')
                : last.name_usual,
        })
      : null;

  return { robots, nextCursor, hasMore, total };
}

interface Cursor {
  id: string;
  sortValue: string;
}

export class InvalidCursorError extends Error {
  constructor() {
    super('invalid cursor');
    this.name = 'InvalidCursorError';
  }
}

/** The sort value a cursor carries must be what its sort compares against, else PostgreSQL fails on the cast. */
function cursorFits(value: string, sort: string): boolean {
  if (sort === 'recent') return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[T ]([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,9})?)?(Z|[+-]\d{2}(:?\d{2})?)?$/.test(value);
  if (sort === 'price_asc' || sort === 'price_desc') return value === '' || /^-?\d+(\.\d+)?$/.test(value);
  return true;
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): Cursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as Cursor).id === 'string' &&
      typeof (parsed as Cursor).sortValue === 'string'
    ) {
      return parsed as Cursor;
    }
    return null;
  } catch {
    return null;
  }
}

export interface ChangeHistoryFilter {
  /** Robot id (entity_type `robot`). */
  readonly robotId?: string;
  readonly kinds?: readonly string[];
  /** ISO dates, both inclusive. */
  readonly from?: string;
  readonly to?: string;
  readonly limit: number;
  readonly offset: number;
}

export interface ChangeHistoryRow {
  id: string;
  entity_type: string;
  entity_id: string;
  kind: string;
  summary_fr: string;
  summary_en: string | null;
  created_at: string;
}

/** Full public change history with filters (pro keys only, task 1071). Reads the public view only. */
export async function listChangeHistory(
  client: SqlClient,
  filter: ChangeHistoryFilter,
): Promise<{ rows: ChangeHistoryRow[]; total: number }> {
  const params: unknown[] = [];
  const where: string[] = [];
  if (filter.robotId) {
    params.push(filter.robotId);
    where.push(`entity_type = 'robot' AND entity_id = $${params.length}`);
  }
  if (filter.kinds && filter.kinds.length > 0) {
    params.push([...filter.kinds]);
    where.push(`kind = ANY($${params.length}::text[])`);
  }
  if (filter.from) {
    params.push(filter.from);
    where.push(`created_at >= $${params.length}::date`);
  }
  if (filter.to) {
    params.push(filter.to);
    where.push(`created_at < ($${params.length}::date + 1)`);
  }
  const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number(
    (await client.query<{ n: string | number }>(`SELECT count(*) AS n FROM public_change ${clause}`, params))[0]?.n ?? 0,
  );
  const rows = await client.query<ChangeHistoryRow>(
    `SELECT id, entity_type, entity_id, kind, summary_fr, summary_en, created_at
       FROM public_change ${clause} ORDER BY created_at DESC, id
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filter.limit, filter.offset],
  );
  return { rows, total };
}

export async function listPublicChanges(
  client: SqlClient,
  limit = 50,
): Promise<
  Array<{
    id: string;
    entity_type: string;
    entity_id: string;
    kind: string;
    summary_fr: string;
    summary_en: string | null;
    created_at: string;
  }>
> {
  return client.query(
    `SELECT id, entity_type, entity_id, kind, summary_fr, summary_en, created_at
       FROM public_change ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
}
