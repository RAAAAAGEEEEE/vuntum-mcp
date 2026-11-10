import { renderValue, type ClaimValue } from '../domain/claim-value.js';
import { sourceDisplayName } from '../domain/source-name.js';
import type { SqlClient } from './sql-client.js';

/**
 * Detailed sources of a fact, for pro keys.
 * Reads `public_fact_observation` only: accepted claims, active, replaced or
 * outdated, from public sources. The same fact = same robot or variant, same
 * predicate, same conditions (`qualifiers_key`).
 */

export interface FactObservationRow {
  readonly claim_id: string;
  readonly robot_variant_id: string | null;
  readonly predicate: string;
  readonly qualifiers_key: string;
  readonly qualifiers: Record<string, unknown>;
  readonly value: ClaimValue;
  readonly evidence_level: string;
  readonly lifecycle_status: string;
  readonly source_published_at: string | null;
  readonly accessed_at: string | null;
  readonly valid_from: string | null;
  readonly valid_to: string | null;
  readonly supersedes_claim_id: string | null;
  readonly source_id: string;
  readonly source_name: string;
  readonly source_url: string | null;
  readonly source_is_official: boolean;
}

export const FACT_SOURCES_MAX_FACTS = 100;

export async function listFactObservations(
  client: SqlClient,
  robotId: string,
  predicate?: string,
): Promise<FactObservationRow[]> {
  return client.query<FactObservationRow>(
    `SELECT claim_id, robot_variant_id, predicate, qualifiers_key, qualifiers, value, evidence_level,
            lifecycle_status, source_published_at, accessed_at, valid_from, valid_to, supersedes_claim_id,
            source_id, source_name, source_url, source_is_official
       FROM public_fact_observation
      WHERE robot_id = $1 AND ($2::text IS NULL OR predicate = $2)
      ORDER BY predicate, qualifiers_key, COALESCE(source_published_at, accessed_at) DESC NULLS LAST, claim_id`,
    [robotId, predicate ?? null],
  );
}

/** One group per fact, every observation listed, newest first; facts with a single observation come last. */
export function groupFactObservations(rows: readonly FactObservationRow[], locale: 'fr' | 'en') {
  const groups = new Map<string, FactObservationRow[]>();
  for (const row of rows) {
    const key = `${row.predicate}\u0000${row.robot_variant_id ?? ''}\u0000${row.qualifiers_key}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const facts = [...groups.values()].map((list) => ({
    predicate: list[0]!.predicate,
    variantId: list[0]!.robot_variant_id,
    qualifiers: list[0]!.qualifiers,
    sourceCount: new Set(list.map((o) => o.source_id)).size,
    observations: list.map((o) => ({
      claimId: o.claim_id,
      value: renderValue(o.value, locale),
      raw: o.value,
      status: o.lifecycle_status,
      evidenceLevel: o.evidence_level,
      source: { name: sourceDisplayName(o.source_name, locale), url: o.source_url, isOfficial: o.source_is_official },
      publishedAt: o.source_published_at,
      accessedAt: o.accessed_at,
      validFrom: o.valid_from,
      validTo: o.valid_to,
      supersedes: o.supersedes_claim_id,
    })),
  }));
  facts.sort((a, b) => b.observations.length - a.observations.length || a.predicate.localeCompare(b.predicate));
  return facts;
}
