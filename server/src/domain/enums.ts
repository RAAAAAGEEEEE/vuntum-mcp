import { z } from 'zod';

/**
 * The initial brief mixed three independent axes into one "status".
 * Mission §6.3 splits them; the derived `verification_status` exposed by the API
 * and MCP recombines them for consumers.
 */

export const evidenceLevels = [
  'manufacturer_claim',
  'manufacturer_demo',
  'independently_reported',
  'independently_tested',
  'vuntum_tested',
  'unverified',
] as const;
export const evidenceLevelSchema = z.enum(evidenceLevels);
export type EvidenceLevel = (typeof evidenceLevels)[number];

export const lifecycleStatuses = ['active', 'disputed', 'outdated', 'superseded', 'retracted'] as const;
export type LifecycleStatus = (typeof lifecycleStatuses)[number];

/** The eight legacy values, derived, never stored. */
export const verificationStatuses = [
  'manufacturer_claim',
  'manufacturer_demo',
  'independently_reported',
  'independently_tested',
  'vuntum_tested',
  'unverified',
  'disputed',
  'outdated',
] as const;
export const verificationStatusSchema = z.enum(verificationStatuses);
export type VerificationStatus = (typeof verificationStatuses)[number];

/**
 * `disputed` and `outdated` outrank the evidence level.
 * A claim that is not accepted+active is never published, so this function is
 * only ever called on publishable claims; it stays total for safety.
 */
export function deriveVerificationStatus(
  evidenceLevel: EvidenceLevel,
  lifecycleStatus: LifecycleStatus,
): VerificationStatus {
  if (lifecycleStatus === 'disputed') return 'disputed';
  if (lifecycleStatus === 'outdated') return 'outdated';
  return evidenceLevel;
}

export const commercialStatuses = [
  'concept',
  'prototype',
  'announced',
  'preorder',
  'shipping_limited',
  'shipping',
  'discontinued',
  'unknown',
] as const;
export const commercialStatusSchema = z.enum(commercialStatuses);
export type CommercialStatus = (typeof commercialStatuses)[number];

/**
 * Market segment of a robot: what it is FOR, independent of its form
 * (`category_slug`: humanoid, quadruped, arm...). Stored in `robot.segment`
 * under a CHECK constraint (migrations 0017, then 0080) that lists the same
 * values.
 *
 * `industrial` (production-line arms, production cobots, factory AGV/AMR) and
 * `defense` (ground robots for defence: unmanned ground vehicles, demining
 * robots, military quadrupeds) are catalogue segments since ADR-077, the two
 * poles of the reference plan. Aerial drones and uncrewed vessels stay out:
 * robot discovery refuses them. Neither segment is ever put forward on the
 * home page (`isPromotable`, ADR-031).
 */
export const robotSegments = [
  'companion',
  'utility',
  'toy',
  'research_education',
  'professional',
  'industrial',
  'defense',
] as const;
export const robotSegmentSchema = z.enum(robotSegments);
export type RobotSegment = (typeof robotSegments)[number];

/** Polymorphic claim subjects; `ai_agent` is reserved so P2 needs no migration of shape. */
export const claimSubjectTypes = [
  'manufacturer',
  'robot',
  'robot_variant',
  'sdk',
  'api',
  'repository',
  'distributor',
  'ai_agent',
] as const;
export type ClaimSubjectType = (typeof claimSubjectTypes)[number];

export const datePrecisions = ['day', 'month', 'year', 'unknown'] as const;
export const datePrecisionSchema = z.enum(datePrecisions);

export const riskClasses = ['low', 'medium', 'high'] as const;
export type RiskClass = (typeof riskClasses)[number];

export const localeCodes = ['fr', 'en'] as const;
export type Locale = (typeof localeCodes)[number];

export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/, 'expected an ISO 4217 code');

/** ISO 3166-1 alpha-2, or a bloc code we define (EU, EEA, WORLD). */
export const marketCodeSchema = z.string().regex(/^[A-Z]{2,5}$/, 'expected a market code');

export const priceTypes = ['msrp', 'street', 'preorder_deposit', 'subscription_monthly', 'lease_monthly', 'quote_only', 'estimated'] as const;
export const priceTypeSchema = z.enum(priceTypes);

/**
 * Vuntum autonomy scale. Documented in docs/EDITORIAL_POLICY.md.
 * Never displayed without an accepted claim behind it.
 */
export const autonomyLevels = [
  'A0_teleoperated',
  'A1_assisted',
  'A2_scripted_tasks',
  'A3_supervised_autonomy',
  'A4_task_autonomy',
  'A5_general_autonomy',
] as const;

/** Segments the public catalogue may contain: all of them. */
export const catalogueSegments: readonly RobotSegment[] = robotSegments;
