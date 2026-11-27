import { isStale } from '../claim.js';
import type { EvidenceLevel, RobotSegment } from '../enums.js';
import {
  catalogueSegmentList,
  categoryLabel,
  latestDate,
  type CatalogueSnapshot,
  type InsightFact,
  type InsightRobot,
} from './snapshot.js';

/**
 * The observatory figures (`/fr/observatoire`), computed once for the page and the MCP tool (task 1389, ADR-585).
 * Pure functions over the published snapshot.
 */

type Locale = 'fr' | 'en';

/** Observatory: published robots and verified claims below which the figures say little. */
export const MIN_OBSERVATORY_ROBOTS = 10;
export const MIN_OBSERVATORY_CLAIMS = 30;
export interface PriceBand {
  readonly min: number;
  readonly max: number | null;
  readonly entries: ReadonlyArray<{
    robot: InsightRobot;
    fact: InsightFact;
    amount: number;
    stale: boolean;
  }>;
}

/**
 * Band limits in the price's own currency. Amounts are never converted: a
 * claim keeps its original currency (mission §6.3), and an estimate would be
 * a Vuntum calculation, not an official price.
 */
export const PRICE_BAND_LIMITS: readonly number[] = [500, 2_000, 10_000, 50_000];

export interface ObservatoryStats {
  readonly generatedAt: string;
  readonly latestVerification: string | null;
  readonly robotCount: number;
  readonly manufacturerCount: number;
  readonly claimCount: number;
  readonly robotClaimCount: number;
  readonly sourceCount: number;
  readonly bySegment: ReadonlyArray<{ segment: RobotSegment | null; count: number }>;
  readonly byForm: ReadonlyArray<{ slug: string | null; label: string; count: number }>;
  readonly byCountry: ReadonlyArray<{ code: string | null; count: number }>;
  readonly byYear: ReadonlyArray<{ year: number | null; count: number }>;
  readonly byEvidence: ReadonlyArray<{ level: EvidenceLevel; count: number }>;
  readonly priceBands: ReadonlyArray<{ currency: string; bands: readonly PriceBand[] }>;
  readonly indexable: boolean;
}

function tally<K>(keys: Iterable<K>): Map<K, number> {
  const out = new Map<K, number>();
  for (const key of keys) out.set(key, (out.get(key) ?? 0) + 1);
  return out;
}

/** Most recent official MSRP per robot and currency. */
function officialPrices(snapshot: CatalogueSnapshot) {
  const best = new Map<string, InsightFact>();
  for (const fact of snapshot.facts) {
    if (fact.predicate !== 'price.msrp' || !fact.sourceIsOfficial || fact.value.kind !== 'money')
      continue;
    const key = `${fact.robotId}|${fact.value.currency}`;
    const current = best.get(key);
    if (!current || Date.parse(fact.lastVerifiedAt) > Date.parse(current.lastVerifiedAt))
      best.set(key, fact);
  }
  return [...best.values()];
}

export function buildObservatory(
  snapshot: CatalogueSnapshot,
  now: Date,
  locale: Locale = 'fr',
  unclassifiedForm = 'Non classé',
): ObservatoryStats {
  const robots = snapshot.robots;
  const byId = new Map(robots.map((robot) => [robot.id, robot]));
  const labels = new Map(
    snapshot.categories.map((category) => [category.slug, categoryLabel(category, locale)]),
  );

  const segmentCounts = tally(robots.map((robot) => robot.segment));
  const bySegment = [
    // A segment without a robot is not a row: its page does not exist (ADR-077).
    ...catalogueSegmentList
      .map((segment) => ({ segment, count: segmentCounts.get(segment) ?? 0 }))
      .filter((row) => row.count > 0),
    ...(segmentCounts.get(null) ? [{ segment: null, count: segmentCounts.get(null) ?? 0 }] : []),
  ];

  const byForm = [...tally(robots.map((robot) => robot.category)).entries()]
    .map(([slug, count]) => ({
      slug,
      label: slug ? (labels.get(slug) ?? slug) : unclassifiedForm,
      count,
    }))
    .sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, locale));

  const byCountry = [...tally(robots.map((robot) => robot.manufacturerCountry)).entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((x, y) => y.count - x.count || (x.code ?? '~').localeCompare(y.code ?? '~'));

  const byYear = [...tally(robots.map((robot) => robot.announcedYear)).entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((x, y) => (y.year ?? -1) - (x.year ?? -1));

  const currencies = new Map<string, PriceBand['entries'][number][]>();
  for (const fact of officialPrices(snapshot)) {
    const robot = byId.get(fact.robotId);
    if (!robot || fact.value.kind !== 'money') continue;
    const list = currencies.get(fact.value.currency) ?? [];
    list.push({
      robot,
      fact,
      amount: fact.value.amount,
      stale: isStale(fact.predicate, fact.lastVerifiedAt, now),
    });
    currencies.set(fact.value.currency, list);
  }
  const priceBands = [...currencies.entries()]
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([currency, entries]) => {
      const limits = [0, ...PRICE_BAND_LIMITS];
      const bands: PriceBand[] = limits.map((min, index) => {
        const max = limits[index + 1] ?? null;
        return {
          min,
          max,
          entries: entries
            .filter((entry) => entry.amount >= min && (max === null || entry.amount < max))
            .sort((x, y) => x.amount - y.amount),
        };
      });
      return { currency, bands: bands.filter((band) => band.entries.length > 0) };
    });

  const claimCount = snapshot.claimsByEvidence.reduce((sum, row) => sum + row.count, 0);

  return {
    generatedAt: snapshot.generatedAt,
    latestVerification: latestDate(snapshot.facts.map((fact) => fact.lastVerifiedAt)),
    robotCount: robots.length,
    manufacturerCount: snapshot.manufacturerCount,
    claimCount,
    robotClaimCount: snapshot.facts.length,
    sourceCount: snapshot.sourceCount,
    bySegment,
    byForm,
    byCountry,
    byYear,
    byEvidence: snapshot.claimsByEvidence,
    priceBands,
    indexable: robots.length >= MIN_OBSERVATORY_ROBOTS && claimCount >= MIN_OBSERVATORY_CLAIMS,
  };
}

