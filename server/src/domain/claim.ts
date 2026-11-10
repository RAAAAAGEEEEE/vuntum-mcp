import type { EvidenceLevel } from './enums.js';
import { getPredicate } from './predicates.js';

/** A claim is stale when its last verification exceeds the predicate freshness. */
export function isStale(
  predicateKey: string,
  lastVerifiedAt: Date | string,
  now: Date = new Date(),
): boolean {
  const predicate = getPredicate(predicateKey);
  const verified = typeof lastVerifiedAt === 'string' ? new Date(lastVerifiedAt) : lastVerifiedAt;
  const ageDays = (now.getTime() - verified.getTime()) / 86_400_000;
  return ageDays > predicate.freshnessDays;
}

/**
 * Deterministic, explainable confidence: never a model's impression.
 *
 * score = 0.40·source trust + 0.35·evidence weight + 0.15·corroboration + 0.10·freshness
 */
export const evidenceWeights: Record<EvidenceLevel, number> = {
  vuntum_tested: 1,
  independently_tested: 0.9,
  independently_reported: 0.7,
  manufacturer_demo: 0.5,
  manufacturer_claim: 0.45,
  unverified: 0.1,
};
