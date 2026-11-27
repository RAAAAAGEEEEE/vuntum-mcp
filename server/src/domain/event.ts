import { gluedReading, normalizeText } from './text.js';

/**
 * The robotics events calendar (task 095, ADR-060): fairs, competitions and
 * conferences, each one tied to the organiser's official page. Whether an
 * event is coming, running or over is computed here from the day, never
 * stored; the calendar file (ICS) is built here too, so the page and the file
 * cannot disagree.
 */

export const eventKinds = ['fair', 'competition', 'conference'] as const;
export type EventKind = (typeof eventKinds)[number];

export const eventKindLabels: Readonly<Record<EventKind, { fr: string; en: string }>> = {
  fair: { fr: 'Salon', en: 'Trade fair' },
  competition: { fr: 'Compétition', en: 'Competition' },
  conference: { fr: 'Conférence', en: 'Conference' },
};

/** The page exists only from this many sourced upcoming events (no empty page). */
export const MIN_EVENTS_PUBLIC = 8;
/** An event that ended stays in « récemment » for this many days. */
export const EVENT_RECENT_DAYS = 90;

export type EventPhase = 'upcoming' | 'running' | 'recent' | 'archived';

const DAY_MS = 86_400_000;

function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / DAY_MS);
}

export interface EventDates {
  /** `YYYY-MM-DD` */
  readonly startsOn: string;
  /** `YYYY-MM-DD`, the last day (same as the start for a one-day event). */
  readonly endsOn: string;
}

export function eventPhase(event: EventDates, today: string): EventPhase {
  const now = dayNumber(today);
  if (now < dayNumber(event.startsOn)) return 'upcoming';
  if (now <= dayNumber(event.endsOn)) return 'running';
  return now - dayNumber(event.endsOn) <= EVENT_RECENT_DAYS ? 'recent' : 'archived';
}

/** Days before the start (0 on the first day), or null once it started. */
export function daysUntilEvent(event: EventDates, today: string): number | null {
  const left = dayNumber(event.startsOn) - dayNumber(today);
  return left >= 0 ? left : null;
}

export interface CalendarEvent extends EventDates {
  readonly id: string;
  readonly slug: string;
}

/** Upcoming and running events, the soonest first. */
export function comingEvents<T extends CalendarEvent>(events: readonly T[], today: string): T[] {
  return events
    .filter((e) => {
      const phase = eventPhase(e, today);
      return phase === 'upcoming' || phase === 'running';
    })
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.slug.localeCompare(b.slug));
}

/** Events over for at most `EVENT_RECENT_DAYS`, the most recent first. */
export function recentEvents<T extends CalendarEvent>(events: readonly T[], today: string): T[] {
  return events
    .filter((e) => eventPhase(e, today) === 'recent')
    .sort((a, b) => b.endsOn.localeCompare(a.endsOn) || a.slug.localeCompare(b.slug));
}

/** The page exists from `MIN_EVENTS_PUBLIC` sourced events still to come (or running). */
export function eventsPageExists(events: readonly CalendarEvent[], today: string): boolean {
  return comingEvents(events, today).length >= MIN_EVENTS_PUBLIC;
}

// ------------------------------------------------------------ dates in words

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y: y ?? 1970, m: (m ?? 1) - 1, d: d ?? 1 };
}

/**
 * The dates of an event in words, French typography: « 12 au 15 mai 2027 »,
 * « 28 octobre au 2 novembre 2027 », « 1er mars 2027 ». No dash: a range is
 * written with « au » / « to ».
 */
export function formatEventDates(event: EventDates, locale: 'fr' | 'en'): string {
  const a = parts(event.startsOn);
  const b = parts(event.endsOn);
  const months = locale === 'fr' ? MONTHS_FR : MONTHS_EN;
  const day = (n: number): string => (locale === 'fr' && n === 1 ? '1er' : String(n));
  const single = event.startsOn === event.endsOn;
  if (locale === 'fr') {
    if (single) return `${day(a.d)} ${months[a.m]} ${a.y}`;
    if (a.y === b.y && a.m === b.m) return `${day(a.d)} au ${day(b.d)} ${months[a.m]} ${a.y}`;
    if (a.y === b.y) return `${day(a.d)} ${months[a.m]} au ${day(b.d)} ${months[b.m]} ${a.y}`;
    return `${day(a.d)} ${months[a.m]} ${a.y} au ${day(b.d)} ${months[b.m]} ${b.y}`;
  }
  if (single) return `${months[a.m]} ${a.d}, ${a.y}`;
  if (a.y === b.y && a.m === b.m) return `${months[a.m]} ${a.d} to ${b.d}, ${a.y}`;
  if (a.y === b.y) return `${months[a.m]} ${a.d} to ${months[b.m]} ${b.d}, ${a.y}`;
  return `${months[a.m]} ${a.d}, ${a.y} to ${months[b.m]} ${b.d}, ${b.y}`;
}

/** « 2026-11 » style month key, for grouping the list by month. */
export function eventMonthKey(event: EventDates): string {
  return event.startsOn.slice(0, 7);
}

export function formatEventMonth(monthKey: string, locale: 'fr' | 'en'): string {
  const { y, m } = parts(`${monthKey}-01`);
  return `${(locale === 'fr' ? MONTHS_FR : MONTHS_EN)[m]} ${y}`;
}

// ------------------------------------------------------------ checks

export interface EventRecordCheck extends EventDates {
  readonly url: string;
  readonly name: string;
  readonly dateText: string;
  readonly placeText: string;
}

function validIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * What a record must satisfy before it is stored: real dates in order, an
 * https address of the organiser, no dash in the texts (house rule), and the
 * words that carry the date and the place on the official page.
 */
export function eventRecordProblems(e: EventRecordCheck): string[] {
  const out: string[] = [];
  if (!validIso(e.startsOn) || !validIso(e.endsOn)) out.push('invalid date');
  else if (e.endsOn < e.startsOn) out.push('ends before it starts');
  else if (dayNumber(e.endsOn) - dayNumber(e.startsOn) > 30) out.push('longer than 31 days');
  if (!/^https:\/\/[^\s/]+\.[^\s/]+/.test(e.url)) out.push('official address is not https');
  if (e.name.trim().length < 3) out.push('no name');
  if (e.dateText.trim().length < 4) out.push('no date wording from the page');
  if (e.placeText.trim().length < 2) out.push('no place wording from the page');
  return out;
}

/** True when the words the page carried when the event was written down are still on it. */
export function pageStillSays(pageText: string, words: string): boolean {
  const w = normalizeText(words).toLowerCase();
  if (w.length === 0) return false;
  if (normalizeText(pageText).toLowerCase().includes(w)) return true;
  // Words copied from the glued text of before ADR-625 are still on a page read since.
  const glued = gluedReading(pageText);
  return glued !== pageText && normalizeText(glued).toLowerCase().includes(w);
}

// ------------------------------------------------------------ ICS

export interface IcsEvent extends CalendarEvent {
  readonly name: string;
  readonly kind: EventKind;
  readonly city: string | null;
  readonly country: string | null;
  readonly online: boolean;
  readonly url: string;
  readonly description: string;
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Lines folded at 75 octets, as RFC 5545 asks (never inside a multi-byte character). */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (size + n > limit) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join('\r\n ');
}

function icsDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '');
}

function nextDay(iso: string): string {
  return new Date((dayNumber(iso) + 1) * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The calendar file: one all-day event per entry (the end date is exclusive
 * in ICS, hence the day after). `stamp` is `YYYYMMDDTHHMMSSZ`.
 */
export function buildIcs(
  events: readonly IcsEvent[],
  options: { locale: 'fr' | 'en'; baseUrl: string; stamp: string; pagePath: string },
): string {
  const { locale, baseUrl, stamp, pagePath } = options;
  const host = new URL(baseUrl).host;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vuntum//Calendrier robotique//' + locale.toUpperCase(),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(locale === 'fr' ? 'Vuntum, événements robotique' : 'Vuntum, robotics events')}`,
    `X-WR-CALDESC:${icsEscape(locale === 'fr' ? `Salons, compétitions et conférences de robotique, avec leur source officielle. ${baseUrl}${pagePath}` : `Robotics fairs, competitions and conferences, each with its official source. ${baseUrl}${pagePath}`)}`,
  ];
  for (const e of events) {
    const where = e.online ? (locale === 'fr' ? 'En ligne' : 'Online') : [e.city, e.country].filter(Boolean).join(', ');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.slug}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.startsOn)}`,
      `DTEND;VALUE=DATE:${icsDate(nextDay(e.endsOn))}`,
      `SUMMARY:${icsEscape(e.name)}`,
      ...(where ? [`LOCATION:${icsEscape(where)}`] : []),
      `DESCRIPTION:${icsEscape(`${eventKindLabels[e.kind][locale]}. ${e.description} ${locale === 'fr' ? 'Source officielle' : 'Official source'} : ${e.url}`)}`,
      `URL:${e.url}`,
      `CATEGORIES:${icsEscape(eventKindLabels[e.kind][locale])}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
