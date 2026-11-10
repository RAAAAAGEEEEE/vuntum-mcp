import { buildTrackerRow, TRACKER_EXCLUDED_SEGMENTS, sortTrackerRows, type TrackerFact, type TrackerPromise, type TrackerRow } from '../domain/humanoid-tracker.js';
import { datedEventIssue } from '../domain/dated-event.js';
import type { SqlClient } from './sql-client.js';

/**
 * The dated state of each humanoid robot, read from the
 * public views only. The page, the API and the MCP tool all call this, so they
 * can never disagree. Rows are built by `buildTrackerRow` (pure, tested).
 */

const PREDICATES = [
  'lifecycle.announced_date',
  'availability.state',
  'price.preorder_deposit',
  'deployment.pilot',
];

interface FactRow {
  robot_id: string;
  predicate: string;
  value: { value?: unknown; precision?: string } | null;
  qualifiers: Record<string, unknown> | null;
  source_published_at: string | Date | null;
  last_verified_at: string | Date | null;
  source_name: string;
  source_page_url: string | null;
  source_url: string | null;
  source_is_official: boolean;
  evidence_level: string;
  quote_original: string | null;
}

interface PromiseRow {
  robot_id: string;
  kind: TrackerPromise['kind'];
  due_on: string | Date;
  due_precision: TrackerPromise['duePrecision'];
  source_url: string;
  source_name: string;
  source_is_official: boolean;
  announced_on: string | Date | null;
}

const iso = (v: string | Date | null): string | null => (v ? new Date(v).toISOString() : null);

export async function loadHumanoidTracker(client: SqlClient, today?: string): Promise<TrackerRow[]> {
  const day = today ?? new Date().toISOString().slice(0, 10);
  const robots = await client.query<{
    id: string;
    slug: string;
    name_usual: string;
    manufacturer_slug: string;
    manufacturer_name: string;
  }>(
    `SELECT id, slug, name_usual, manufacturer_slug, manufacturer_name
       FROM public_robot
      WHERE category_slug = 'humanoide' AND NOT (COALESCE(segment, '') = ANY($1::text[]))`,
    [TRACKER_EXCLUDED_SEGMENTS],
  );
  if (robots.length === 0) return [];
  const ids = robots.map((r) => r.id);
  const [facts, promises] = await Promise.all([
    client.query<FactRow>(
      `SELECT robot_id, predicate, value, qualifiers, source_published_at, last_verified_at, source_name,
              source_page_url, source_url, source_is_official, evidence_level, quote_original
         FROM public_fact
        WHERE robot_id = ANY($1::text[]) AND predicate = ANY($2::text[])`,
      [ids, PREDICATES],
    ),
    client.query<PromiseRow>(
      `SELECT robot_id, kind, due_on, due_precision, source_url, source_name, source_is_official, announced_on
         FROM public_promise WHERE robot_id = ANY($1::text[])`,
      [ids],
    ),
  ]);

  const factsBy = new Map<string, TrackerFact[]>();
  for (const f of facts) {
    const value = typeof f.value?.value === 'string' ? f.value.value : null;
    if (f.predicate === 'deployment.pilot') {
      // The same check as at extraction, run again on what is stored (as the proof journal does).
      const year = f.source_published_at ? new Date(f.source_published_at).getUTCFullYear() : null;
      if (!value || !f.quote_original) continue;
      if (datedEventIssue({ predicate: f.predicate, value: { kind: 'text', value }, quote: f.quote_original, pageYear: year })) continue;
    }
    const market = typeof f.qualifiers?.['market'] === 'string' ? (f.qualifiers['market'] as string) : null;
    const list = factsBy.get(f.robot_id) ?? [];
    list.push({
      predicate: f.predicate,
      value,
      valuePrecision: f.value?.precision ?? null,
      market,
      sourcePublishedAt: iso(f.source_published_at),
      lastVerifiedAt: iso(f.last_verified_at),
      sourceName: f.source_name,
      sourceUrl: f.source_page_url ?? f.source_url,
      sourceIsOfficial: f.source_is_official,
      evidenceLevel: f.evidence_level,
    });
    factsBy.set(f.robot_id, list);
  }
  const promisesBy = new Map<string, TrackerPromise[]>();
  for (const p of promises) {
    const list = promisesBy.get(p.robot_id) ?? [];
    list.push({
      kind: p.kind,
      dueOn: new Date(p.due_on).toISOString().slice(0, 10),
      duePrecision: p.due_precision,
      sourceUrl: p.source_url,
      sourceName: p.source_name,
      sourceIsOfficial: p.source_is_official,
      announcedOn: p.announced_on ? new Date(p.announced_on).toISOString().slice(0, 10) : null,
    });
    promisesBy.set(p.robot_id, list);
  }

  const rows: TrackerRow[] = [];
  for (const r of robots) {
    const row = buildTrackerRow(
      { slug: r.slug, name: r.name_usual, makerSlug: r.manufacturer_slug, makerName: r.manufacturer_name },
      factsBy.get(r.id) ?? [],
      promisesBy.get(r.id) ?? [],
      day,
    );
    if (row) rows.push(row);
  }
  return sortTrackerRows(rows);
}
