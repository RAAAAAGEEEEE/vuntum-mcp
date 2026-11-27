import { isStale } from '../claim.js';
import { defenceSheetRestrictions } from './defence-sheet.js';
import {
  isCatalogueSegment,
  isPromotable,
  type CatalogueSnapshot,
  type InsightFact,
  type InsightRobot,
} from './snapshot.js';
import {
  allRankingSlugs,
  BUDGET_LIMITS,
  type BudgetCurrency,
  type RankingAbility,
  type RankingCriterion,
  type RankingGroup,
  type RankingKey,
} from './ranking-slugs.js';

/**
 * « Meilleur robot pour… » and rankings (ADR-058). Pure functions over the
 * published snapshot: which pages exist, who is on them, in which order.
 *
 * Three rules keep a ranking honest:
 *  1. it needs at least MIN_RANKING_ROBOTS robots with a sourced, comparable
 *     value, else there is no page (a choice between two is not a ranking);
 *  2. the order comes from ONE published criterion, stated on the page, never
 *     from a score, an opinion or an average of unlike things;
 *  3. a value is only used when it is comparable: no variant, no measurement
 *     condition for the numbers; the same currency (never converted) for a price.
 */

export const MIN_RANKING_ROBOTS = 4;

export type RankingKind = 'ranking' | 'budget' | 'ability';

interface CriterionRule {
  readonly predicate: string;
  readonly unit: string;
  /** `asc`: the lowest value ranks first. */
  readonly order: 'asc' | 'desc';
}

const CRITERIA: Readonly<Record<RankingCriterion, CriterionRule>> = {
  weight: { predicate: 'mass.weight', unit: 'kg', order: 'asc' },
  speed: { predicate: 'mobility.max_speed', unit: 'm/s', order: 'desc' },
  payload: { predicate: 'payload.carry', unit: 'kg', order: 'desc' },
};

const ABILITIES: Readonly<Record<RankingAbility, string>> = {
  stairs: 'mobility.stairs',
  ros: 'software.ros',
  sdk: 'software.sdk_public',
};

export interface RankingEntry {
  readonly robot: InsightRobot;
  readonly fact: InsightFact;
  /** The number the order rests on (a price, a weight...), null for a selection. */
  readonly amount: number | null;
  /** 1 for the first; robots with the same value share a rank. */
  readonly rank: number | null;
  readonly stale: boolean;
}

export interface Ranking {
  readonly key: RankingKey;
  readonly slug: string;
  readonly kind: RankingKind;
  readonly criterion: RankingCriterion | null;
  readonly entries: readonly RankingEntry[];
  /** Robots of the group, before the value filter. */
  readonly consideredCount: number;
  readonly latestVerification: string | null;
  readonly currency: BudgetCurrency | null;
}

function mostRecentFirst(x: InsightFact, y: InsightFact): number {
  return Date.parse(y.lastVerifiedAt) - Date.parse(x.lastVerifiedAt);
}

function inGroup(robot: InsightRobot, group: RankingGroup): boolean {
  if (group.kind === 'form') return robot.category === group.slug;
  return (robot.utilities as readonly string[]).includes(group.slug);
}

/** A robot may be ranked as an ordinary promotion may (ADR-031) and has a full sheet (ADR-034). */
export function isRankable(robot: InsightRobot): boolean {
  // A defence robot never enters a « best for » ranking (ADR-078).
  return defenceSheetRestrictions(robot.segment).rankable && isCatalogueSegment(robot.segment) && robot.sheetLevel !== 'light' && isPromotable(robot);
}

function byName(x: RankingEntry, y: RankingEntry): number {
  return x.robot.name.localeCompare(y.robot.name, 'en') || (x.robot.slug < y.robot.slug ? -1 : 1);
}

function withRanks(entries: RankingEntry[], order: 'asc' | 'desc'): RankingEntry[] {
  const sorted = entries
    .slice()
    .sort((x, y) => {
      const diff = (x.amount ?? 0) - (y.amount ?? 0);
      return diff === 0 ? byName(x, y) : order === 'asc' ? diff : -diff;
    });
  let rank = 0;
  return sorted.map((entry, index) => {
    if (index === 0 || entry.amount !== sorted[index - 1]?.amount) rank = index + 1;
    return { ...entry, rank };
  });
}

function latest(entries: readonly RankingEntry[]): string | null {
  let best: string | null = null;
  for (const entry of entries) {
    if (best === null || Date.parse(entry.fact.lastVerifiedAt) > Date.parse(best)) {
      best = entry.fact.lastVerifiedAt;
    }
  }
  return best;
}

function factsByRobot(snapshot: CatalogueSnapshot, predicate: string): Map<string, InsightFact[]> {
  const out = new Map<string, InsightFact[]>();
  for (const fact of snapshot.facts) {
    if (fact.predicate !== predicate) continue;
    const list = out.get(fact.robotId) ?? [];
    list.push(fact);
    out.set(fact.robotId, list);
  }
  return out;
}

/**
 * Whether a fact is the robot's plain, general value: it names no variant and
 * no measurement condition, so two robots' values can be set side by side.
 */
export function isPlainFact(fact: InsightFact): boolean {
  return !fact.qualifiers['variant'] && !fact.qualifiers['conditions'];
}

function buildCriterionRanking(
  snapshot: CatalogueSnapshot,
  key: Extract<RankingKey, { kind: 'ranking' }>,
  slug: string,
  now: Date,
): Ranking | null {
  const rule = CRITERIA[key.criterion];
  const group = snapshot.robots.filter((robot) => isRankable(robot) && inGroup(robot, key.group));
  const facts = factsByRobot(snapshot, rule.predicate);
  const entries: RankingEntry[] = [];
  for (const robot of group) {
    const fact = (facts.get(robot.id) ?? [])
      .filter(
        (candidate) =>
          candidate.value.kind === 'number' &&
          candidate.value.unit === rule.unit &&
          candidate.value.value > 0 &&
          isPlainFact(candidate),
      )
      .sort(mostRecentFirst)[0];
    if (!fact || fact.value.kind !== 'number') continue;
    entries.push({
      robot,
      fact,
      amount: fact.value.value,
      rank: null,
      stale: isStale(fact.predicate, fact.lastVerifiedAt, now),
    });
  }
  if (entries.length < MIN_RANKING_ROBOTS) return null;
  const ranked = withRanks(entries, rule.order);
  return {
    key,
    slug,
    kind: 'ranking',
    criterion: key.criterion,
    entries: ranked,
    consideredCount: group.length,
    latestVerification: latest(ranked),
    currency: null,
  };
}

function buildBudgetRanking(
  snapshot: CatalogueSnapshot,
  key: Extract<RankingKey, { kind: 'budget' }>,
  slug: string,
  now: Date,
): Ranking | null {
  const low = key.band === 0 ? 0 : (BUDGET_LIMITS[key.band - 1] ?? 0);
  const high = BUDGET_LIMITS[key.band] ?? null;
  const group = snapshot.robots.filter(isRankable);
  const facts = factsByRobot(snapshot, 'price.msrp');
  const entries: RankingEntry[] = [];
  for (const robot of group) {
    // The official public price, in this currency: the most recent one.
    const fact = (facts.get(robot.id) ?? [])
      .filter(
        (candidate) =>
          candidate.value.kind === 'money' &&
          candidate.value.currency === key.currency &&
          candidate.sourceIsOfficial,
      )
      .sort(mostRecentFirst)[0];
    if (!fact || fact.value.kind !== 'money') continue;
    const amount = fact.value.amount;
    if (amount < low || (high !== null && amount >= high)) continue;
    entries.push({
      robot,
      fact,
      amount,
      rank: null,
      stale: isStale(fact.predicate, fact.lastVerifiedAt, now),
    });
  }
  if (entries.length < MIN_RANKING_ROBOTS) return null;
  const ranked = withRanks(entries, 'asc');
  return {
    key,
    slug,
    kind: 'budget',
    criterion: null,
    entries: ranked,
    consideredCount: group.length,
    latestVerification: latest(ranked),
    currency: key.currency,
  };
}

/** A selection, not a ranking: robots whose sources say they have the ability, in alphabetical order. */
function buildAbilityPage(
  snapshot: CatalogueSnapshot,
  key: Extract<RankingKey, { kind: 'ability' }>,
  slug: string,
  now: Date,
): Ranking | null {
  const group = snapshot.robots.filter(isRankable);
  const facts = factsByRobot(snapshot, ABILITIES[key.ability]);
  const entries: RankingEntry[] = [];
  for (const robot of group) {
    const robotFacts = (facts.get(robot.id) ?? []).filter((c) => c.value.kind === 'tristate');
    // A source that says « no » for the same robot is a disagreement: the robot is left out.
    if (robotFacts.some((c) => c.value.kind === 'tristate' && c.value.value === 'no')) continue;
    const fact = robotFacts
      .filter((c) => c.value.kind === 'tristate' && c.value.value === 'yes')
      .sort(mostRecentFirst)[0];
    if (!fact) continue;
    entries.push({
      robot,
      fact,
      amount: null,
      rank: null,
      stale: isStale(fact.predicate, fact.lastVerifiedAt, now),
    });
  }
  if (entries.length < MIN_RANKING_ROBOTS) return null;
  const sorted = entries.slice().sort(byName);
  return {
    key,
    slug,
    kind: 'ability',
    criterion: null,
    entries: sorted,
    consideredCount: group.length,
    latestVerification: latest(sorted),
    currency: null,
  };
}

/** One page by its French address; null when the data does not support it (no page). */
export function buildRanking(
  snapshot: CatalogueSnapshot,
  slugFr: string,
  now: Date = new Date(snapshot.generatedAt),
): Ranking | null {
  const found = allRankingSlugs().find((entry) => entry.fr === slugFr);
  if (!found) return null;
  const { key } = found;
  if (key.kind === 'ranking') return buildCriterionRanking(snapshot, key, found.fr, now);
  if (key.kind === 'budget') return buildBudgetRanking(snapshot, key, found.fr, now);
  return buildAbilityPage(snapshot, key, found.fr, now);
}

/** Every page the data supports today, in the order of the hub. */
export function eligibleRankings(
  snapshot: CatalogueSnapshot,
  now: Date = new Date(snapshot.generatedAt),
): Ranking[] {
  const out: Ranking[] = [];
  for (const entry of allRankingSlugs()) {
    const ranking = buildRanking(snapshot, entry.fr, now);
    if (ranking) out.push(ranking);
  }
  return out;
}

/** Other robots' pages worth showing next to this one: same family first. */
export function relatedRankings(all: readonly Ranking[], current: Ranking): Ranking[] {
  return all.filter((other) => other.slug !== current.slug && other.kind === current.kind).slice(0, 6);
}


/**
 * A ranking of robots no longer followed (ADR-632): the home robots form (vacuum cleaners,
 * mowers, small household robots). The housework use is not one: humanoids do housework too. It stays readable, `noindex` and out of the sitemap; nothing is deleted.
 */
export function isAbandonedRanking(ranking: Pick<Ranking, 'key'>): boolean {
  const key = ranking.key;
  if (key.kind !== 'ranking') return false;
  return key.group.kind === 'form' && key.group.slug === 'domestique';
}
