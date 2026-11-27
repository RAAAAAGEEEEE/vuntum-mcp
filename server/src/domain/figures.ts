import { normalizeText } from './text.js';

/**
 * Key figures of robotics companies (task 105, ADR-069): funding rounds,
 * valuations, headcounts. Each figure is tied to the company's own page, with
 * the words of that page that carry it and the date of the page. Wording and
 * formatting are computed here so the page, the sitemap and the tests agree.
 */

export const figureKinds = ['round', 'valuation', 'headcount', 'total_raised'] as const;
export type FigureKind = (typeof figureKinds)[number];

export const figureKindLabels: Readonly<Record<FigureKind, { fr: string; en: string }>> = {
  round: { fr: 'Levée de fonds', en: 'Funding round' },
  valuation: { fr: 'Valorisation', en: 'Valuation' },
  headcount: { fr: 'Effectif', en: 'Headcount' },
  total_raised: { fr: 'Total levé', en: 'Total raised' },
};

/** How the company words the number: « over 300 », « nearly $1 billion ». */
export const figureQualifiers = ['over', 'nearly', 'about'] as const;
export type FigureQualifier = (typeof figureQualifiers)[number];

const QUALIFIER_FR: Readonly<Record<FigureQualifier, string>> = {
  over: 'plus de',
  nearly: 'près de',
  about: 'environ',
};
const QUALIFIER_EN: Readonly<Record<FigureQualifier, string>> = {
  over: 'over',
  nearly: 'nearly',
  about: 'about',
};

/** The page exists only from this many sourced figures (no empty page). */
export const MIN_FIGURES_PUBLIC = 10;

export function figuresPageExists(count: number): boolean {
  return count >= MIN_FIGURES_PUBLIC;
}

const NBSP = ' ';
const CURRENCY_SYMBOL: Readonly<Record<string, string>> = { USD: '$', EUR: '€' };

function trimmed(n: number, locale: 'fr' | 'en'): string {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 })
    .format(n)
    .replace(/ /g, NBSP);
}

/**
 * « 39 Md$ » / « $39 billion », « 120 M€ » / « €120 million », « 2,5 Md CNY ».
 * Amounts are in units of the currency; nothing is converted.
 */
export function formatAmount(amount: number, currency: string, locale: 'fr' | 'en'): string {
  const big = amount >= 1e9;
  const scaled = big ? amount / 1e9 : amount / 1e6;
  const num = trimmed(scaled, locale);
  const symbol = CURRENCY_SYMBOL[currency];
  if (locale === 'fr') {
    const unit = big ? 'Md' : 'M';
    return symbol ? `${num}${NBSP}${unit}${symbol}` : `${num}${NBSP}${unit}${NBSP}${currency}`;
  }
  const word = big ? 'billion' : 'million';
  return symbol ? `${symbol}${num} ${word}` : `${num} ${word} ${currency}`;
}

export interface FigureValue {
  readonly kind: FigureKind;
  readonly amount: number | null;
  readonly currency: string | null;
  readonly headcount: number | null;
  readonly qualifier: FigureQualifier | null;
}

/** The value as a reader sees it, qualifier included (« plus de 300 », « près de 1 Md$ »). */
export function formatFigure(f: FigureValue, locale: 'fr' | 'en'): string {
  const q = f.qualifier ? (locale === 'fr' ? QUALIFIER_FR : QUALIFIER_EN)[f.qualifier] : null;
  let core: string;
  if (f.kind === 'headcount') {
    core = trimmed(f.headcount ?? 0, locale);
    return q ? `${q} ${core}` : core;
  }
  core = formatAmount(f.amount ?? 0, f.currency ?? 'USD', locale);
  return q ? `${q} ${core}` : core;
}

/** « 15 janvier 2025 » / « January 15, 2025 » from an ISO date. */
export function formatFigureDate(iso: string, locale: 'fr' | 'en'): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export interface FigureCompanyRow {
  readonly id: string;
  readonly companyName: string;
  readonly asOf: string;
}

export interface FigureGroup<T extends FigureCompanyRow> {
  readonly companyName: string;
  readonly rows: T[];
}

/** One group per company, most recent figure first inside a group; companies by their latest date. */
export function groupFigures<T extends FigureCompanyRow>(rows: readonly T[]): FigureGroup<T>[] {
  const byCompany = new Map<string, T[]>();
  for (const row of rows) {
    const list = byCompany.get(row.companyName) ?? [];
    list.push(row);
    byCompany.set(row.companyName, list);
  }
  return [...byCompany.entries()]
    .map(([companyName, list]) => ({
      companyName,
      rows: [...list].sort((a, b) => b.asOf.localeCompare(a.asOf) || a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => (b.rows[0]?.asOf ?? '').localeCompare(a.rows[0]?.asOf ?? '') || a.companyName.localeCompare(b.companyName));
}

export interface FigureRecordCheck {
  readonly companyName: string;
  readonly kind: FigureKind;
  readonly amount?: number | null;
  readonly currency?: string | null;
  readonly headcount?: number | null;
  readonly qualifier?: FigureQualifier | null;
  readonly asOf: string;
  readonly valueText: string;
  readonly url: string;
  readonly sourceText: string;
}

const HTTPS = /^https:\/\/[^\s/]+\.[^\s/]+/;

/**
 * What a record must satisfy before it is stored: an https page of the company
 * (or its regulatory filing), a date, the words of that page that carry the
 * figure, and the figure written exactly as those words write it (`valueText`
 * must be inside `sourceText`, so a number cannot drift from its source).
 */
export function figureRecordProblems(r: FigureRecordCheck): string[] {
  const out: string[] = [];
  if (r.companyName.trim().length < 2) out.push('no company');
  if (r.kind === 'headcount') {
    if (!Number.isInteger(r.headcount) || (r.headcount ?? 0) < 1) out.push('invalid headcount');
    if (r.amount != null) out.push('headcount with an amount');
  } else {
    if (!(typeof r.amount === 'number') || !Number.isFinite(r.amount) || r.amount <= 0) out.push('invalid amount');
    if (!r.currency || !/^[A-Z]{3}$/.test(r.currency)) out.push('invalid currency');
    if (r.headcount != null) out.push('amount with a headcount');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.asOf) || Number.isNaN(Date.parse(r.asOf))) out.push('invalid date');
  if (!HTTPS.test(r.url)) out.push('page address is not https');
  const words = normalizeText(r.sourceText).toLowerCase();
  if (words.length < 15) out.push('no wording from the page');
  const value = normalizeText(r.valueText).toLowerCase();
  if (value.length < 1 || !words.includes(value)) out.push('figure not written in the page wording');
  return out;
}
