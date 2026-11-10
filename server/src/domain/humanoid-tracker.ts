import { parseDatedEvent } from './dated-event.js';
import { promiseStatus, type PromiseKind } from './promise.js';

/**
 * The dated state of each humanoid robot: announced,
 * pre-order, on sale, shown at a customer, and on sale in France, each stage
 * with the day it was reached and the page that says so, then the gap between
 * the date the maker promised and the day it happened. Everything is read from
 * the public facts already accepted; nothing is stored and nothing is guessed:
 * a stage without a dated public fact and a source page is simply absent.
 */

export const trackerStages = ['announced', 'preorder', 'on_sale', 'customer'] as const;
export type TrackerStage = (typeof trackerStages)[number];

/**
 * Segments left out of the tracker and of the report: a collectible toy sold all year (a
 * 839 EUR transformable figure of a film character) says nothing about when a humanoid robot can be bought, and
 * would count as "on sale in France" for the wrong reason. The robot keeps its sheet and its place in the catalogue.
 */
export const TRACKER_EXCLUDED_SEGMENTS: readonly string[] = ['toy'];

export type TrackerPrecision = 'day' | 'month' | 'year';

/** One public fact, as the tracker reads it. */
export interface TrackerFact {
  readonly predicate: string;
  /** The value of the claim (`value.value`), a string for the predicates read here. */
  readonly value: string | null;
  readonly valuePrecision: string | null;
  readonly market: string | null;
  readonly sourcePublishedAt: string | null;
  readonly lastVerifiedAt: string | null;
  readonly sourceName: string;
  readonly sourceUrl: string | null;
  readonly sourceIsOfficial: boolean;
  readonly evidenceLevel: string;
}

export interface TrackerPromise {
  readonly kind: PromiseKind;
  readonly dueOn: string;
  readonly duePrecision: TrackerPrecision;
  readonly sourceUrl: string;
  readonly sourceName: string;
  readonly sourceIsOfficial: boolean;
  readonly announcedOn: string | null;
}

export interface TrackerRobot {
  readonly slug: string;
  readonly name: string;
  readonly makerSlug: string;
  readonly makerName: string;
}

/** A stage reached: when, how sure the day is, and the page that says it. */
export interface TrackerProof {
  /** ISO day. */
  readonly date: string;
  readonly precision: TrackerPrecision;
  /** `published`: the day the source page is dated; `checked`: the day the fact was last checked (the page has no date). */
  readonly dateKind: 'published' | 'checked' | 'stated';
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly official: boolean;
  /** The market the fact is about, when it names one. */
  readonly market: string | null;
  /** The sale state for `preorder` and `on_sale`, the customer's name for `customer`. */
  readonly state: string | null;
}

export type TrackerGapKey = 'open' | 'overdue' | 'kept_on_time' | 'kept_late';

/** The promised date against what happened. */
export interface TrackerGap {
  readonly key: TrackerGapKey;
  readonly kind: PromiseKind;
  readonly dueOn: string;
  readonly duePrecision: TrackerPrecision;
  /** Days past the deadline (overdue, or kept late), else 0. */
  readonly daysLate: number;
  /** Days left (open), else 0. */
  readonly daysLeft: number;
  readonly sourceUrl: string;
  readonly sourceName: string;
  readonly sourceIsOfficial: boolean;
  /** The day the stage that settles it was reached (kept), else null. */
  readonly reachedOn: string | null;
}

export interface TrackerRow {
  readonly robot: TrackerRobot;
  readonly announced: TrackerProof | null;
  readonly preorder: TrackerProof | null;
  readonly onSale: TrackerProof | null;
  /** Shown at a named customer (a dated pilot or delivery fact), not merely on sale. */
  readonly customer: TrackerProof | null;
  /** On sale or open for orders in France: a fact whose market is FR. */
  readonly france: TrackerProof | null;
  readonly gap: TrackerGap | null;
  /** The furthest stage with a proof. */
  readonly furthest: TrackerStage;
}

const day = (v: string): string => v.slice(0, 10);
const precisionOf = (p: string | null | undefined): TrackerPrecision => (p === 'month' || p === 'year' ? p : 'day');
const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

/** The day a stage was reached: the date the page carries, else the day the fact was last checked. */
function proofOf(f: TrackerFact, state: string | null): TrackerProof | null {
  if (!f.sourceUrl) return null;
  const published = f.sourcePublishedAt && ISO_DAY.test(f.sourcePublishedAt) ? day(f.sourcePublishedAt) : null;
  const checked = f.lastVerifiedAt && ISO_DAY.test(f.lastVerifiedAt) ? day(f.lastVerifiedAt) : null;
  const date = published ?? checked;
  if (!date) return null;
  return {
    date,
    precision: 'day',
    dateKind: published ? 'published' : 'checked',
    sourceName: f.sourceName,
    sourceUrl: f.sourceUrl,
    official: f.sourceIsOfficial,
    market: f.market,
    state,
  };
}

/** The earliest proof: a stage is reached on the first day a page said so. */
function earliest(proofs: readonly TrackerProof[]): TrackerProof | null {
  return [...proofs].sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

const SALE = new Set(['available']);
const ORDER = new Set(['preorder', 'waitlist']);

export function buildTrackerRow(
  robot: TrackerRobot,
  facts: readonly TrackerFact[],
  promises: readonly TrackerPromise[],
  today: string,
): TrackerRow | null {
  const announced: TrackerProof[] = [];
  const preorder: TrackerProof[] = [];
  const onSale: TrackerProof[] = [];
  const customer: TrackerProof[] = [];
  const france: TrackerProof[] = [];

  for (const f of facts) {
    if (f.predicate === 'lifecycle.announced_date' && f.value && ISO_DAY.test(f.value) && f.sourceUrl) {
      announced.push({
        date: day(f.value),
        precision: precisionOf(f.valuePrecision),
        dateKind: 'stated',
        sourceName: f.sourceName,
        sourceUrl: f.sourceUrl,
        official: f.sourceIsOfficial,
        market: null,
        state: null,
      });
    } else if (f.predicate === 'availability.state' && f.value) {
      const proof = proofOf(f, f.value);
      if (!proof) continue;
      if (ORDER.has(f.value)) preorder.push(proof);
      if (SALE.has(f.value)) onSale.push(proof);
      if (f.market === 'FR' && (SALE.has(f.value) || ORDER.has(f.value))) france.push(proof);
    } else if (f.predicate === 'price.preorder_deposit') {
      // A deposit asked on the maker's page means orders are open, on the day the page says so.
      const proof = proofOf(f, 'preorder');
      if (proof) preorder.push(proof);
    } else if (f.predicate === 'deployment.pilot' && f.value && f.sourceUrl) {
      // A named customer and a day, written by the page (the loader re-checks the quote, as the proof journal does).
      const event = parseDatedEvent(f.value);
      if (!event || event.date > today) continue;
      customer.push({
        date: event.date,
        precision: event.precision,
        dateKind: 'stated',
        sourceName: f.sourceName,
        sourceUrl: f.sourceUrl,
        official: f.sourceIsOfficial,
        market: null,
        state: event.party,
      });
    }
  }

  const row = {
    announced: earliest(announced),
    preorder: earliest(preorder),
    onSale: earliest(onSale),
    customer: earliest(customer),
    france: earliest(france),
  };
  const furthest: TrackerStage | null = row.customer
    ? 'customer'
    : row.onSale
      ? 'on_sale'
      : row.preorder
        ? 'preorder'
        : row.announced
          ? 'announced'
          : null;
  if (!furthest) return null;
  return { robot, ...row, gap: gapOf(promises, row.onSale, today), furthest };
}

/**
 * The promised date against the day the robot went on sale. Only a release or a
 * delivery promise is settled by a sale; a price or a volume never is
 * (`promiseStatus`). The most pressing promise is kept: an overdue one first.
 */
function gapOf(
  promises: readonly TrackerPromise[],
  onSale: TrackerProof | null,
  today: string,
): TrackerGap | null {
  const gaps: TrackerGap[] = [];
  for (const p of promises) {
    if (p.kind !== 'release' && p.kind !== 'delivery') continue;
    const status = promiseStatus(
      { dueOn: p.dueOn, kind: p.kind, availableSince: onSale?.date ?? null, discontinued: false },
      today,
    );
    const key: TrackerGapKey =
      status.key === 'kept' ? (status.daysLate > 0 ? 'kept_late' : 'kept_on_time') : status.key === 'overdue' ? 'overdue' : 'open';
    gaps.push({
      key,
      kind: p.kind,
      dueOn: p.dueOn,
      duePrecision: p.duePrecision,
      daysLate: status.daysLate,
      daysLeft: status.daysLeft,
      sourceUrl: p.sourceUrl,
      sourceName: p.sourceName,
      sourceIsOfficial: p.sourceIsOfficial,
      reachedOn: key === 'kept_late' || key === 'kept_on_time' ? (onSale?.date ?? null) : null,
    });
  }
  const rank: Record<TrackerGapKey, number> = { overdue: 0, kept_late: 1, open: 2, kept_on_time: 3 };
  return gaps.sort((a, b) => rank[a.key] - rank[b.key] || a.dueOn.localeCompare(b.dueOn))[0] ?? null;
}

const FURTHEST_RANK: Record<TrackerStage, number> = { customer: 0, on_sale: 1, preorder: 2, announced: 3 };

/** Furthest stage first, then the most recent proof, then the name: the page's order. */
export function sortTrackerRows(rows: readonly TrackerRow[]): TrackerRow[] {
  const latest = (r: TrackerRow): string =>
    [r.customer, r.onSale, r.preorder, r.announced].filter(Boolean).map((p) => p?.date ?? '').sort().reverse()[0] ?? '';
  return [...rows].sort(
    (a, b) =>
      FURTHEST_RANK[a.furthest] - FURTHEST_RANK[b.furthest] ||
      latest(b).localeCompare(latest(a)) ||
      a.robot.name.localeCompare(b.robot.name),
  );
}

/** One proof as the API and the MCP tool give it: the day, how it was dated, the page. */
function proofData(p: TrackerProof | null): Record<string, unknown> | null {
  return p
    ? {
        date: p.date,
        datePrecision: p.precision,
        dateKind: p.dateKind,
        sourceName: p.sourceName,
        sourceUrl: p.sourceUrl,
        sourceIsOfficial: p.official,
        market: p.market,
        ...(p.state ? { detail: p.state } : {}),
      }
    : null;
}

/**
 * A row as data (API `/api/v1/humanoid-tracker`, MCP `get_humanoid_tracker`):
 * a stage nobody proved is `null`, never "no", so a reader cannot take an
 * unknown for a negative.
 */
export function trackerRowData(row: TrackerRow, pageUrl: (slug: string) => string): Record<string, unknown> {
  return {
    robot: { slug: row.robot.slug, name: row.robot.name, url: pageUrl(row.robot.slug) },
    manufacturer: { slug: row.robot.makerSlug, name: row.robot.makerName },
    furthestStage: row.furthest,
    announced: proofData(row.announced),
    preorder: proofData(row.preorder),
    onSale: proofData(row.onSale),
    atCustomer: proofData(row.customer),
    inFrance: proofData(row.france),
    promise: row.gap
      ? {
          kind: row.gap.kind,
          dueOn: row.gap.dueOn,
          dueOnPrecision: row.gap.duePrecision,
          outcome: row.gap.key,
          daysLate: row.gap.daysLate,
          daysLeft: row.gap.daysLeft,
          reachedOn: row.gap.reachedOn,
          sourceName: row.gap.sourceName,
          sourceUrl: row.gap.sourceUrl,
          sourceIsOfficial: row.gap.sourceIsOfficial,
        }
      : null,
  };
}

/** The sentence that goes with the data, so a machine does not read a `null` as a "no". */
export const TRACKER_NULL_NOTE = {
  fr: 'Une étape à null n’est pas établie par une source publique datée : ce n’est pas un « non ».',
  en: 'A stage set to null is not established by a dated public source: it is not a “no”.',
} as const;
