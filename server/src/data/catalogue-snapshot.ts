import type { ClaimValue } from '../domain/claim-value.js';
import type { CommercialStatus, EvidenceLevel, RobotSegment } from '../domain/enums.js';
import type { CatalogueSnapshot, InsightFact, InsightRobot } from '../domain/rankings/snapshot.js';
import { isHomeTask } from '../domain/taxonomy.js';
import { parseUtilities } from '../domain/utilities.js';
import type { SqlClient } from './sql-client.js';

/**
 * Loads the published catalogue in a handful of queries, for the rankings and the observatory tools.
 * Reads the public_* views only: nothing here can see a draft, a candidate claim or sample data.
 */

interface RobotRow {
  id: string;
  slug: string;
  name_usual: string;
  name_native: string | null;
  manufacturer_slug: string;
  manufacturer_name: string;
  manufacturer_country: string | null;
  category_slug: string | null;
  segment: RobotSegment | null;
  utilities: string[] | null;
  commercial_status: CommercialStatus;
  announced_year: number | null;
  last_verified_at: string | null;
  /** What a household robot does (`public_robot.home_task`). */
  home_task: string | null;
  /** `full`, or `light` for an identity-only sheet. */
  sheet_level?: string | null;
}

interface FactRow {
  claim_id: string;
  robot_id: string;
  predicate: string;
  value: ClaimValue;
  qualifiers: Record<string, string> | null;
  evidence_level: EvidenceLevel;
  last_verified_at: string | Date;
  source_published_at: string | Date | null;
  accessed_at: string | Date;
  source_id: string;
  source_name: string;
  source_url: string | null;
  source_is_official: boolean;
}

/** Both drivers are used (postgres.js in production, PGlite in tests); dates may come back as Date. */
function iso(value: string | Date): string;
function iso(value: string | Date | null): string | null;
function iso(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export interface SnapshotOptions {
  /** Restrict robots and facts to one segment (a robot sheet only needs its own). */
  readonly segment?: RobotSegment;
  readonly now?: Date;
}

export async function loadCatalogueSnapshot(
  client: SqlClient,
  options: SnapshotOptions = {},
): Promise<CatalogueSnapshot> {
  const params: unknown[] = options.segment ? [options.segment] : [];
  const robotFilter = options.segment ? 'WHERE r.segment = $1' : '';

  const robots = await client.query<RobotRow>(
    `SELECT r.id, r.slug, r.name_usual, r.name_native, r.manufacturer_slug, r.manufacturer_name,
            m.country_code AS manufacturer_country, r.category_slug, r.segment, r.utilities,
            r.commercial_status, r.announced_year, r.last_verified_at, r.home_task,
            to_jsonb(r) ->> 'sheet_level' AS sheet_level
       FROM public_robot r
       LEFT JOIN public_manufacturer m ON m.id = r.manufacturer_id
       ${robotFilter}
      ORDER BY r.name_usual, r.id`,
    params,
  );

  // A fact belongs to a robot through robot_id, or through its subject when
  // the subject is the robot itself: the same rule as the robot sheet.
  const facts = await client.query<FactRow>(
    `SELECT f.claim_id,
            COALESCE(f.robot_id, f.subject_id) AS robot_id,
            f.predicate, f.value, f.qualifiers, f.evidence_level, f.last_verified_at,
            f.source_published_at, f.accessed_at,
            f.source_id, f.source_name, f.source_url, f.source_is_official
       FROM public_fact f
      WHERE (f.robot_id IS NOT NULL OR f.subject_type = 'robot')
        ${
          options.segment
            ? `AND COALESCE(f.robot_id, f.subject_id) IN (SELECT id FROM public_robot WHERE segment = $1)`
            : ''
        }
      ORDER BY f.predicate, f.claim_id`,
    params,
  );

  const categories = await client.query<{ slug: string; label_fr: string; label_en: string | null }>(
    'SELECT slug, label_fr, label_en FROM public_robot_category ORDER BY position, slug',
  );
  const evidence = await client.query<{ evidence_level: EvidenceLevel; count: string | number }>(
    'SELECT evidence_level, count(*) AS count FROM public_fact GROUP BY evidence_level ORDER BY evidence_level',
  );
  const totals = await client.query<{ sources: string | number; manufacturers: string | number }>(
    `SELECT (SELECT count(DISTINCT source_id) FROM public_fact) AS sources,
            (SELECT count(*) FROM public_manufacturer)         AS manufacturers`,
  );

  const robotList: InsightRobot[] = robots.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name_usual,
    nativeName: row.name_native,
    manufacturerSlug: row.manufacturer_slug,
    manufacturerName: row.manufacturer_name,
    manufacturerCountry: row.manufacturer_country,
    category: row.category_slug,
    segment: row.segment,
    utilities: parseUtilities(row.utilities),
    commercialStatus: row.commercial_status,
    announcedYear: row.announced_year === null ? null : Number(row.announced_year),
    homeTask: isHomeTask(row.home_task) ? row.home_task : null,
    ...(row.sheet_level === 'light' ? { sheetLevel: 'light' as const } : {}),
    lastVerifiedAt: row.last_verified_at === null ? null : iso(row.last_verified_at),
  }));
  const known = new Set(robotList.map((robot) => robot.id));

  const factList: InsightFact[] = facts
    .filter((row) => known.has(row.robot_id))
    .map((row) => ({
      claimId: row.claim_id,
      robotId: row.robot_id,
      predicate: row.predicate,
      value: row.value,
      qualifiers: row.qualifiers ?? {},
      evidenceLevel: row.evidence_level,
      lastVerifiedAt: iso(row.last_verified_at),
      sourcePublishedAt: iso(row.source_published_at),
      accessedAt: iso(row.accessed_at),
      sourceId: row.source_id,
      sourceName: row.source_name,
      sourceUrl: row.source_url,
      sourceIsOfficial: row.source_is_official,
    }));

  return {
    robots: robotList,
    facts: factList,
    categories: categories.map((row) => ({
      slug: row.slug,
      label: row.label_fr,
      ...(row.label_en ? { labelEn: row.label_en } : {}),
    })),
    claimsByEvidence: evidence.map((row) => ({
      level: row.evidence_level,
      count: Number(row.count),
    })),
    sourceCount: Number(totals[0]?.sources ?? 0),
    manufacturerCount: Number(totals[0]?.manufacturers ?? 0),
    generatedAt: (options.now ?? new Date()).toISOString(),
  };
}

