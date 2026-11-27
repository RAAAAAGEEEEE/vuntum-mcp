import { normalizeText } from './text.js';

/**
 * Robot competition results (task 104, ADR-067): the ranking of a competition,
 * each row tied to the organiser's official results page. Grouping and wording
 * are computed here so the page, the sitemap and the tests agree.
 */

export const resultAutonomyLevels = ['autonomous', 'teleoperated', 'not_stated'] as const;
export type ResultAutonomy = (typeof resultAutonomyLevels)[number];

export const resultAutonomyLabels: Readonly<Record<ResultAutonomy, { fr: string; en: string }>> = {
  autonomous: { fr: 'Autonome', en: 'Autonomous' },
  teleoperated: { fr: 'Téléguidé', en: 'Teleoperated' },
  not_stated: { fr: 'Non précisé', en: 'Not stated' },
};

/** The page exists only from this many sourced result rows (no empty page). */
export const MIN_RESULTS_PUBLIC = 10;

/** « 1er », « 2e » in French, « 1st », « 2nd » in English. */
export function rankLabel(rank: number, locale: 'fr' | 'en'): string {
  if (locale === 'fr') return rank === 1 ? '1er' : `${rank}e`;
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  return `${rank}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[rank % 10] ?? 'th'}`;
}

export interface ResultRow {
  readonly id: string;
  readonly competitionSlug: string;
  readonly editionYear: number;
  /** The discipline as the organiser names it (English key), grouping key. */
  readonly disciplineKey: string;
  /** The discipline in the reader's language, shown as the heading (the key when absent). */
  readonly discipline?: string;
  readonly rank: number;
}

export interface ResultGroup<T extends ResultRow> {
  readonly key: string;
  readonly competitionSlug: string;
  readonly editionYear: number;
  readonly disciplines: ReadonlyArray<{ discipline: string; rows: T[] }>;
}

/**
 * Editions, the most recent year first; inside an edition, disciplines in the
 * order the registry wrote them, rows by rank.
 */
export function groupResults<T extends ResultRow>(rows: readonly T[]): ResultGroup<T>[] {
  const groups = new Map<string, { slug: string; year: number; byDiscipline: Map<string, T[]> }>();
  for (const row of rows) {
    const key = `${row.competitionSlug}-${row.editionYear}`;
    let group = groups.get(key);
    if (!group) {
      group = { slug: row.competitionSlug, year: row.editionYear, byDiscipline: new Map() };
      groups.set(key, group);
    }
    const list = group.byDiscipline.get(row.disciplineKey) ?? [];
    list.push(row);
    group.byDiscipline.set(row.disciplineKey, list);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].year - a[1].year || a[1].slug.localeCompare(b[1].slug))
    .map(([key, g]) => ({
      key,
      competitionSlug: g.slug,
      editionYear: g.year,
      disciplines: [...g.byDiscipline.entries()].map(([key, list]) => ({
        discipline: list[0]?.discipline ?? key,
        rows: [...list].sort((a, b) => a.rank - b.rank),
      })),
    }));
}

/** The page exists from `MIN_RESULTS_PUBLIC` sourced rows. */
export function resultsPageExists(count: number): boolean {
  return count >= MIN_RESULTS_PUBLIC;
}

export interface ResultRecordCheck {
  readonly team: string;
  readonly disciplineFr: string;
  readonly disciplineEn: string;
  readonly rank: number;
  readonly url: string;
  readonly sourceText: string;
  readonly autonomy: ResultAutonomy;
  readonly autonomyText?: string | null;
  readonly autonomyUrl?: string | null;
}

const HTTPS = /^https:\/\/[^\s/]+\.[^\s/]+/;

/**
 * What a record must satisfy before it is stored: an https official page, the
 * words of that page that carry the ranking, and, for an autonomy level other
 * than « not stated », the organiser's own sentence and the page that has it.
 */
export function resultRecordProblems(r: ResultRecordCheck): string[] {
  const out: string[] = [];
  if (!Number.isInteger(r.rank) || r.rank < 1) out.push('invalid rank');
  if (r.team.trim().length < 2) out.push('no team');
  if (r.disciplineFr.trim().length < 2 || r.disciplineEn.trim().length < 2) out.push('no discipline');
  if (!HTTPS.test(r.url)) out.push('official address is not https');
  if (normalizeText(r.sourceText).length < 3) out.push('no ranking wording from the page');
  if (r.autonomy !== 'not_stated') {
    if (!r.autonomyText || normalizeText(r.autonomyText).length < 10) out.push('autonomy without the organiser wording');
    if (!r.autonomyUrl || !HTTPS.test(r.autonomyUrl)) out.push('autonomy without its https page');
  }
  return out;
}
