import type { ClaimValue } from '../claim-value.js';
import { isDefenceSegment } from '../defence.js';
import { catalogueSegments, type CommercialStatus, type EvidenceLevel, type RobotSegment } from '../enums.js';
import type { HomeTask } from '../taxonomy.js';
import type { RobotUtility } from '../utilities.js';

/**
 * The published catalogue as the data pages and the MCP server read it (task 1389, ADR-585):
 * one snapshot type, one rule for which robots may be ranked or promoted.
 */

/** Every segment has its page since ADR-077 (industrial and defence included). */
export type CatalogueSegment = RobotSegment;

export interface InsightRobot {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly nativeName: string | null;
  readonly manufacturerSlug: string;
  readonly manufacturerName: string;
  readonly manufacturerCountry: string | null;
  readonly category: string | null;
  readonly segment: RobotSegment | null;
  /** What the robot is useful for (ADR-027): several at once. */
  readonly utilities: readonly RobotUtility[];
  readonly commercialStatus: CommercialStatus;
  readonly announcedYear: number | null;
  readonly lastVerifiedAt: string | null;
  /** What a household robot does (ADR-021), null outside the `utility` segment. */
  readonly homeTask?: HomeTask | null;
  /** `light` for a light sheet (ADR-034): never paired. */
  readonly sheetLevel?: 'full' | 'light';
}

/** A published fact about a robot, without its quote (list pages never carry quotes). */
export interface InsightFact {
  readonly claimId: string;
  readonly robotId: string;
  readonly predicate: string;
  readonly value: ClaimValue;
  readonly qualifiers: Record<string, string>;
  readonly evidenceLevel: EvidenceLevel;
  readonly lastVerifiedAt: string;
  readonly sourcePublishedAt: string | null;
  readonly accessedAt: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceUrl: string | null;
  readonly sourceIsOfficial: boolean;
}

export interface CatalogueSnapshot {
  readonly robots: readonly InsightRobot[];
  /** Accepted, active facts whose subject is a published robot or variant. */
  readonly facts: readonly InsightFact[];
  /** Forms carried by at least one published robot, with their labels (French, English). */
  readonly categories: ReadonlyArray<{ slug: string; label: string; labelEn?: string }>;
  /** Every public claim, whatever its subject, by evidence level. */
  readonly claimsByEvidence: ReadonlyArray<{ level: EvidenceLevel; count: number }>;
  readonly sourceCount: number;
  readonly manufacturerCount: number;
  readonly generatedAt: string;
}

export const catalogueSegmentList: readonly CatalogueSegment[] =
  catalogueSegments as readonly CatalogueSegment[];

export function isCatalogueSegment(value: string | null | undefined): value is CatalogueSegment {
  return typeof value === 'string' && (catalogueSegmentList as readonly string[]).includes(value);
}

/**
 * Whether a robot may be put forward (home page « robots du moment »): an
 * industrial robot, a companion or a defence robot (by its segment since
 * ADR-077, or by its utility) is in the directory and has its sheet, never a
 * promotion (ADR-031).
 */
export function isPromotable(robot: {
  readonly segment: string | null;
  readonly utilities: readonly string[];
}): boolean {
  if (isDefenceSegment(robot.segment)) return false;
  if (robot.segment === 'industrial' || robot.segment === 'companion') return false;
  return !robot.utilities.some((utility) => utility === 'compagnie' || utility === 'defense-securite');
}

export function latestDate(dates: Iterable<string | null | undefined>): string | null {
  let best: string | null = null;
  for (const date of dates) {
    if (!date) continue;
    if (best === null || Date.parse(date) > Date.parse(best)) best = date;
  }
  return best;
}


/** A form's name in the reader's language. */
export function categoryLabel(
  category: { label: string; labelEn?: string },
  locale: 'fr' | 'en',
): string {
  return locale === 'en' ? (category.labelEn ?? category.label) : category.label;
}

