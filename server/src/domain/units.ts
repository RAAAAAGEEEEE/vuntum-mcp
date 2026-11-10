/**
 * Unit conversion to SI canonical units. The original value and its original
 * text are always kept on the claim: normalisation never destroys the source.
 */

export type Dimension =
  | 'length'
  | 'mass'
  | 'speed'
  | 'duration'
  | 'power'
  | 'energy'
  | 'angle'
  | 'count'
  | 'ratio'
  | 'money';

export interface UnitDefinition {
  readonly dimension: Dimension;
  /** Multiply by this to reach the canonical unit. */
  readonly factor: number;
  readonly canonical: string;
}

export const units: Record<string, UnitDefinition> = {
  // length -> metre
  m: { dimension: 'length', factor: 1, canonical: 'm' },
  cm: { dimension: 'length', factor: 0.01, canonical: 'm' },
  mm: { dimension: 'length', factor: 0.001, canonical: 'm' },
  km: { dimension: 'length', factor: 1000, canonical: 'm' },
  in: { dimension: 'length', factor: 0.0254, canonical: 'm' },
  ft: { dimension: 'length', factor: 0.3048, canonical: 'm' },
  // mass -> kilogram
  kg: { dimension: 'mass', factor: 1, canonical: 'kg' },
  g: { dimension: 'mass', factor: 0.001, canonical: 'kg' },
  lb: { dimension: 'mass', factor: 0.45359237, canonical: 'kg' },
  // speed -> metre per second
  'm/s': { dimension: 'speed', factor: 1, canonical: 'm/s' },
  'km/h': { dimension: 'speed', factor: 1 / 3.6, canonical: 'm/s' },
  mph: { dimension: 'speed', factor: 0.44704, canonical: 'm/s' },
  // duration -> second
  s: { dimension: 'duration', factor: 1, canonical: 's' },
  min: { dimension: 'duration', factor: 60, canonical: 's' },
  h: { dimension: 'duration', factor: 3600, canonical: 's' },
  day: { dimension: 'duration', factor: 86400, canonical: 's' },
  month: { dimension: 'duration', factor: 2_629_746, canonical: 's' },
  year: { dimension: 'duration', factor: 31_556_952, canonical: 's' },
  // power -> watt
  W: { dimension: 'power', factor: 1, canonical: 'W' },
  kW: { dimension: 'power', factor: 1000, canonical: 'W' },
  // energy -> watt-hour
  Wh: { dimension: 'energy', factor: 1, canonical: 'Wh' },
  kWh: { dimension: 'energy', factor: 1000, canonical: 'Wh' },
  mAh: { dimension: 'energy', factor: Number.NaN, canonical: 'Wh' }, // needs a voltage: refused
  // angle -> degree
  deg: { dimension: 'angle', factor: 1, canonical: 'deg' },
  rad: { dimension: 'angle', factor: 180 / Math.PI, canonical: 'deg' },
  // dimensionless
  count: { dimension: 'count', factor: 1, canonical: 'count' },
  ratio: { dimension: 'ratio', factor: 1, canonical: 'ratio' },
  '%': { dimension: 'ratio', factor: 0.01, canonical: 'ratio' },
};

/**
 * Significant digits of a number as written: 7.56 has 3, 12.01 has 4, 1500
 * has 2 (trailing zeros of an integer say nothing), 0.50 read as 0.5 has 1.
 */
export function significantDigits(n: number): number {
  if (!Number.isFinite(n) || n === 0) return 1;
  let text = String(Math.abs(n));
  if (text.includes('e')) text = (text.split('e')[0] ?? text);
  const hasPoint = text.includes('.');
  let digits = text.replace('.', '').replace(/^0+/, '');
  if (!hasPoint) digits = digits.replace(/0+$/, '');
  return Math.max(1, digits.length);
}

/** A stored value as shown: figure, unit, and how many significant digits to keep. */
export interface PresentedNumber {
  value: number;
  unit: string;
  significantDigits: number | null;
  /** The whole value when it reads best in two units: « 1 h 30 ». Replaces `value` and `unit`. */
  compound?: string;
}

const YEAR_SECONDS = 31_556_952;
const MONTH_SECONDS = 2_629_746;
const DAY_SECONDS = 86_400;

function isWhole(n: number, tolerance: number): boolean {
  return Math.abs(n - Math.round(n)) <= tolerance;
}

/** A duration stored in seconds, in the unit a reader expects (audit of 05/10/2026: « 21 600 s »). */
function presentDuration(value: number): PresentedNumber {
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const out = (n: number, unit: string): PresentedNumber => ({ value: sign * n, unit, significantDigits: null });
  // Long periods only when they are whole: a warranty, never an autonomy.
  if (abs >= YEAR_SECONDS * 0.99 && isWhole(abs / YEAR_SECONDS, 0.01)) return out(Math.round(abs / YEAR_SECONDS), 'year');
  if (abs >= MONTH_SECONDS * 1.99 && isWhole(abs / MONTH_SECONDS, 0.02)) return out(Math.round(abs / MONTH_SECONDS), 'month');
  if (abs >= 7 * DAY_SECONDS && isWhole(abs / DAY_SECONDS, 0.001)) return out(Math.round(abs / DAY_SECONDS), 'day');
  if (abs < 60) return out(abs, 's');
  if (abs < 3600) return out(Number.parseFloat((abs / 60).toPrecision(12)), 'min');
  const totalMinutes = Math.round(abs / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return out(hours, 'h');
  return {
    value: sign * (abs / 3600),
    unit: 'h',
    significantDigits: null,
    compound: `${sign < 0 ? '-' : ''}${hours} h ${String(minutes).padStart(2, '0')}`,
  };
}

/**
 * A stored SI value in the unit a reader expects: a robot 0.0998 m
 * tall printed « 0,1 m » lost what the source said (3.93 in). Lengths under
 * a metre are written in centimetres, under a centimetre in millimetres, a
 * mass under a kilogram in grams, each to three significant digits. A speed
 * in m/s is shown in km/h (0.694 m/s is « 2,5 km/h »), a duration in seconds
 * in hours and minutes (5400 s is « 1 h 30 »), or years, months, days for a
 * warranty. Anything else is left as stored.
 *
 * With the figure the source wrote (`original`), nothing is lost on the way
 * back (audit of 10/10/2026): 6 km/h stored as 1.67 m/s was shown « 6,01 km/h »
 * and 103.5 mm « 10,4 cm », and the second reading refused both as wrong. When
 * the source unit is the one shown, its figure is shown; after a change of
 * prefix the shown figure keeps the digits the source wrote. An original that no
 * longer matches the stored value (0.5 %, the rounding of ADR-029) is ignored.
 */
export function presentNumber(
  value: number,
  unit: string,
  original?: { value?: number | undefined; unit?: string | undefined },
): PresentedNumber {
  const shown = presentStored(value, unit, 3);
  if (shown.compound || original?.value === undefined || !original.unit) return shown;
  const def = units[original.unit];
  if (!def || def.canonical !== unit || !Number.isFinite(def.factor)) return shown;
  if (Math.abs(original.value * def.factor - value) > Math.abs(value) * 0.005) return shown;
  if (original.unit === shown.unit) return { value: original.value, unit: shown.unit, significantDigits: null };
  // Only a change of prefix (mm, g) is exact: 14.17 in stays « 36 cm ».
  const exponent = Math.log10(def.factor);
  if (Math.abs(exponent - Math.round(exponent)) >= 1e-12) {
    // Converted once from the source, not from the stored value already
    // rounded (audit of 18/10/2026): 3 mph stored as 1.34 m/s was shown
    // « 4,82 km/h » where 3 mph is 4,83 km/h, and the second reading refused it.
    return shown.significantDigits ? presentStored(original.value * def.factor, unit, shown.significantDigits) : shown;
  }
  const digits = significantDigits(original.value);
  return shown.significantDigits && digits > shown.significantDigits ? presentStored(value, unit, digits) : shown;
}

function presentStored(value: number, unit: string, digits: number): PresentedNumber {
  const abs = Math.abs(value);
  if (unit === 'm' && abs > 0 && abs < 1) {
    return abs >= 0.01
      ? { value: Number.parseFloat((value * 100).toPrecision(12)), unit: 'cm', significantDigits: digits }
      : { value: Number.parseFloat((value * 1000).toPrecision(12)), unit: 'mm', significantDigits: digits };
  }
  if (unit === 'kg' && abs > 0 && abs < 1) {
    return { value: Number.parseFloat((value * 1000).toPrecision(12)), unit: 'g', significantDigits: digits };
  }
  if (unit === 'm/s' && abs > 0) {
    return { value: Number.parseFloat((value * 3.6).toPrecision(digits)), unit: 'km/h', significantDigits: digits };
  }
  if (unit === 's' && abs > 0) return presentDuration(value);
  return { value, unit, significantDigits: null };
}

/**
 * The unit as written next to a figure: years, months and days are words and
 * agree with the number (« 1 an », « 2 ans », « 6 mois »); the others are symbols.
 */
export function presentedUnitLabel(unit: string, value: number, locale: 'fr' | 'en'): string {
  const plural = Math.abs(value) >= 2;
  switch (unit) {
    case 'year':
      return locale === 'fr' ? (plural ? 'ans' : 'an') : plural ? 'years' : 'year';
    case 'month':
      return locale === 'fr' ? 'mois' : plural ? 'months' : 'month';
    case 'day':
      return locale === 'fr' ? (plural ? 'jours' : 'jour') : plural ? 'days' : 'day';
    // A bare number (degrees of freedom, axes): « 31 count » means nothing in either language.
    case 'count':
      return '';
    default:
      return unit;
  }
}
