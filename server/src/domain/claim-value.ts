import { z } from 'zod';
import { currencyCodeSchema, datePrecisionSchema, marketCodeSchema, priceTypeSchema } from './enums.js';
import { getPredicate } from './predicates.js';
import { presentedUnitLabel, presentNumber } from './units.js';

/**
 * A claim value is always structured, always carries the original wording, and
 * is always validated against its predicate before it can be stored.
 *
 * "Unknown / not disclosed" is a first-class value, distinct from "no":
 * hence the tri-state kind.
 */

export const numberValueSchema = z.object({
  kind: z.literal('number'),
  /** Value expressed in the predicate's canonical SI unit. */
  value: z.number().finite(),
  unit: z.string().min(1),
  originalValue: z.number().finite().optional(),
  originalUnit: z.string().optional(),
  originalText: z.string().optional(),
});

export const moneyValueSchema = z.object({
  kind: z.literal('money'),
  /** Amount in the original currency: currencies are never converted into a claim. */
  amount: z.number().finite().nonnegative(),
  currency: currencyCodeSchema,
  priceType: priceTypeSchema,
  originalText: z.string().optional(),
});

export const tristateValueSchema = z.object({
  kind: z.literal('tristate'),
  value: z.enum(['yes', 'no', 'unknown']),
  originalText: z.string().optional(),
});

export const enumValueSchema = z.object({
  kind: z.literal('enum'),
  value: z.string().min(1),
  originalText: z.string().optional(),
});

export const textValueSchema = z.object({
  kind: z.literal('text'),
  value: z.string().min(1).max(500),
  language: z.string().optional(),
});

export const dateValueSchema = z.object({
  kind: z.literal('date'),
  /** ISO-8601 date; the precision says how much of it is meaningful. */
  value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  precision: datePrecisionSchema,
  originalText: z.string().optional(),
});

export const claimValueSchema = z.discriminatedUnion('kind', [
  numberValueSchema,
  moneyValueSchema,
  tristateValueSchema,
  enumValueSchema,
  textValueSchema,
  dateValueSchema,
]);

export type ClaimValue = z.infer<typeof claimValueSchema>;
export type NumberValue = z.infer<typeof numberValueSchema>;
export type MoneyValue = z.infer<typeof moneyValueSchema>;

export const qualifiersSchema = z
  .object({
    /** Prices and availability are always relative to a market. */
    market: marketCodeSchema.optional(),
    configuration: z.string().max(120).optional(),
    /** e.g. "autonomie en marche lente": makes two numbers non-comparable. */
    conditions: z.string().max(200).optional(),
    variant: z.string().max(120).optional(),
  })
  .catchall(z.string().max(200));

export type Qualifiers = z.infer<typeof qualifiersSchema>;

/** Human-readable rendering used in drafts, exports and the factual audit. */
export function renderValue(value: ClaimValue, locale: 'fr' | 'en' = 'fr'): string {
  switch (value.kind) {
    case 'number': {
      const shown = presentNumber(value.value, value.unit, { value: value.originalValue, unit: value.originalUnit });
      if (shown.compound) return shown.compound;
      const unit = presentedUnitLabel(shown.unit, shown.value, locale);
      return `${formatNumber(shown.value, locale, shown.significantDigits)} ${unit}`.trim();
    }
    case 'money':
      return `${formatNumber(value.amount, locale)} ${value.currency}`;
    case 'tristate':
      return locale === 'fr'
        ? { yes: 'Oui', no: 'Non', unknown: 'Non communiqué' }[value.value]
        : { yes: 'Yes', no: 'No', unknown: 'Not disclosed' }[value.value];
    case 'enum':
      return value.value;
    case 'text':
      return value.value;
    case 'date':
      return value.value;
  }
}

function formatNumber(n: number, locale: 'fr' | 'en', significantDigits: number | null = null): string {
  return new Intl.NumberFormat(
    locale === 'fr' ? 'fr-FR' : 'en-GB',
    significantDigits ? { maximumSignificantDigits: significantDigits } : { maximumFractionDigits: 3 },
  ).format(n);
}

/**
 * Compares two values of the same predicate.
 * Returns `null` when they are not comparable (different kinds or units).
 */
export function valuesAgree(
  predicateKey: string,
  a: ClaimValue,
  b: ClaimValue,
): boolean | null {
  if (a.kind !== b.kind) return null;
  const tolerance = getPredicate(predicateKey).conflictTolerance;

  switch (a.kind) {
    case 'number': {
      const other = b as NumberValue;
      if (a.unit !== other.unit) return null;
      const scale = Math.max(Math.abs(a.value), Math.abs(other.value), 1e-9);
      return Math.abs(a.value - other.value) / scale <= tolerance;
    }
    case 'money': {
      const other = b as MoneyValue;
      if (a.currency !== other.currency || a.priceType !== other.priceType) return null;
      const scale = Math.max(a.amount, other.amount, 1e-9);
      return Math.abs(a.amount - other.amount) / scale <= tolerance;
    }
    case 'tristate':
      return a.value === (b as typeof a).value;
    case 'enum':
      return a.value === (b as typeof a).value;
    case 'text':
      return spellingKey(a.value) === spellingKey((b as typeof a).value);
    case 'date':
      return a.value === (b as typeof a).value;
  }
}

/**
 * A text value with its typography removed: case, accents, spaces and
 * punctuation between words (« Unitree SDK2 », « unitree_sdk2 »; « Raspberry
 * Pi CM 4 », « CM4 »; « C++ », « CPLUS »). The separator between two digit
 * runs stays (« 1.5 » is not « 15 »), and no word is dropped: « Alexa » and
 * « Amazon Alexa » still differ (03/10/2026, ADR-083).
 */
export function spellingKey(value: string): string {
  const runs = value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\+\+/g, 'plus')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((run) => run.length > 0);
  let key = '';
  for (const run of runs) {
    if (key && /\p{N}$/u.test(key) && /^\p{N}/u.test(run)) key += ' ';
    key += run;
  }
  return key;
}
