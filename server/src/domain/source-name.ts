import type { Locale } from './enums.js';

/**
 * A source is stored under its French name, with a short French complement in
 * parentheses: « Robosen (pages produit officielles) », « Futura-Sciences
 * (Actualités) ». English pages must not show that French complement.
 *
 * Fixed text, no model: a closed table of the complements Vuntum itself writes
 * (seed, official-page backfill). The proper name before the parentheses is
 * never touched, and a complement that is not in the table (« Robot », « GitHub »,
 * « ニュースルーム ») stays as it is.
 */
export const SOURCE_COMPLEMENTS_EN: Readonly<Record<string, string>> = {
  'pages produit officielles': 'official product pages',
  actualités: 'news',
  communiqués: 'press releases',
  'plan de site': 'sitemap',
  boutique: 'shop',
  presse: 'press',
  'centre de presse': 'press centre',
  robotique: 'robotics',
  'blog robotique': 'robotics blog',
  'électronique grand public': 'consumer electronics',
  'aéronautique et défense': 'aerospace and defence',
  'maison connectée': 'smart home',
  tests: 'reviews',
  'test mammotion luba 3 awd': 'Mammotion Luba 3 AWD review',
  allemand: 'German',
  japon: 'Japan',
  '« robot »': '“robot”',
};

function translatePart(part: string): string {
  const trimmed = part.trim();
  const found = SOURCE_COMPLEMENTS_EN[trimmed.toLowerCase()];
  if (found === undefined) return trimmed;
  const capital = trimmed.charAt(0) !== trimmed.charAt(0).toLowerCase();
  return capital ? found.charAt(0).toUpperCase() + found.slice(1) : found;
}

const COMPLEMENT = /^(.*\S)\s*\(([^()]+)\)\s*$/;

/** The source's name as the reader's language shows it: French as stored, English with the complement translated. */
export function sourceDisplayName(name: string, locale: Locale): string {
  if (locale !== 'en') return name;
  const match = COMPLEMENT.exec(name);
  if (!match) return name;
  const whole = match[2]!;
  const translated = Object.hasOwn(SOURCE_COMPLEMENTS_EN, whole.trim().toLowerCase())
    ? translatePart(whole)
    : whole.split(',').map(translatePart).join(', ');
  return `${match[1]} (${translated})`;
}
