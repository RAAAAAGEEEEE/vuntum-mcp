import type { BadgeFactInput } from './badges.js';
import type { CommercialStatus } from './enums.js';

/**
 * Reality level of a robot: how far the robot is from a product
 * a reader can actually get. Derived, never typed, from the commercial status
 * and the validated claims only; the maker's own words never raise it above
 * « paper » (« demo » needs a demonstration evidence level, « deployed » an
 * availability claim plus a commercial status that itself rests on claims).
 */
export const realityLevels = ['deployed', 'pilot', 'demo', 'paper'] as const;
export type RealityLevel = (typeof realityLevels)[number];

export const realityBases = ['on_sale', 'limited_run', 'demo_evidence', 'claims_only'] as const;
export type RealityBasis = (typeof realityBases)[number];

export interface RealityVerdict {
  readonly level: RealityLevel;
  /** The proof that justifies the level: which rule fired. */
  readonly basis: RealityBasis;
}

export interface RealitySubjectInput {
  readonly commercialStatus: CommercialStatus;
  readonly facts: readonly Pick<BadgeFactInput, 'predicate' | 'evidenceLevel' | 'lifecycleStatus' | 'simpleValue'>[];
}

const DEMO_EVIDENCE = new Set(['manufacturer_demo', 'independently_tested', 'vuntum_tested']);

/**
 * The sourced claim that a robot was shown or tried for real at a named place
 * or customer (`demonstration.on_site`, ADR-162). It is a demonstration
 * whatever the evidence level of the page: it only exists once its quote
 * passed the code gate (name, word, year) and the two readings, so a media
 * page that reports a trial on site is enough, a maker's word alone is not
 * what makes it count.
 */
const DEMO_PREDICATES = new Set(['demonstration.on_site']);

/**
 * Rules, strongest first, the first that holds wins:
 * 1. deployed: commercial status `shipping` and an active availability claim
 *    `available` or `sold_out` (it was sold);
 * 2. pilot: commercial status `shipping_limited` and an active availability claim;
 * 3. demo: an active claim whose evidence level is a demonstration or a test,
 *    or an active `demonstration.on_site` claim (a sourced trial on site);
 * 4. paper: at least one active claim, or a status `concept`, `prototype`,
 *    `announced` or `preorder`.
 * No level (`null`) for a withdrawn robot and for one with neither claim nor
 * status: a level without proof is never shown.
 *
 * A price alone (`price.msrp`, even from the maker's own page) never raises
 * the level: it is the maker's word and is published before preorders too.
 * A validated availability `available` already proves the sale: the sheet
 * rules (`commercialStatusFrom`) turn it into the status `shipping`, so rule 1
 * covers it (audit of 05/10/2026, measured: no published robot at status
 * `unknown` had a validated availability claim).
 */
export function deriveRealityLevel(subject: RealitySubjectInput): RealityVerdict | null {
  const active = subject.facts.filter((f) => f.lifecycleStatus === 'active');
  const availability = active.filter((f) => f.predicate === 'availability.state');
  const status = subject.commercialStatus;

  if (status === 'discontinued') return null;
  if (
    status === 'shipping' &&
    availability.some((f) => f.simpleValue === 'available' || f.simpleValue === 'sold_out')
  ) {
    return { level: 'deployed', basis: 'on_sale' };
  }
  if (status === 'shipping_limited' && availability.length > 0) {
    return { level: 'pilot', basis: 'limited_run' };
  }
  if (active.some((f) => DEMO_EVIDENCE.has(f.evidenceLevel) || DEMO_PREDICATES.has(f.predicate))) {
    return { level: 'demo', basis: 'demo_evidence' };
  }
  if (
    active.length > 0 ||
    status === 'concept' ||
    status === 'prototype' ||
    status === 'announced' ||
    status === 'preorder'
  ) {
    return { level: 'paper', basis: 'claims_only' };
  }
  return null;
}
