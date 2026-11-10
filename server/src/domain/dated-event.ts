import { normalizeText } from './text.js';

/**
 * Dated, named events of a robot that the proof journal lists (task 136,
 * ADR-065): a pilot or first delivery (a deployment named at a client) and a recall (an official
 * recall). Each is a text claim written `AAAA[-MM[-JJ]]|Nom`: the date the
 * source gives for the event, then the client or the authority it names. They
 * go through the usual extraction, the high-risk gate and the two readings
 *; the code below is what the gate cannot see: the date and the name
 * must be in the quote itself, so nothing is stored that the page does not say.
 */

export const DATED_EVENT_PREDICATES = ['deployment.pilot', 'demonstration.on_site', 'safety.recall'] as const;
export type DatedEventPredicate = (typeof DATED_EVENT_PREDICATES)[number];

export function isDatedEventPredicate(predicate: string): predicate is DatedEventPredicate {
  return (DATED_EVENT_PREDICATES as readonly string[]).includes(predicate);
}

export interface DatedEvent {
  /** ISO day; the first of the month or of the year when the source gives no more. */
  date: string;
  precision: 'day' | 'month' | 'year';
  /** The client of a pilot, the authority (or maker) of a recall. */
  party: string;
}

const VALUE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?\|(.{2,160})$/s;

/** The event a stored value stands for, or null when it is not written as one. */
export function parseDatedEvent(text: string): DatedEvent | null {
  const match = VALUE.exec(text.trim());
  if (!match) return null;
  const [, year, month, dayOfMonth, rawParty] = match;
  const party = normalizeText(rawParty ?? '');
  if (party.length < 2) return null;
  const y = Number(year);
  const m = month ? Number(month) : 1;
  const d = dayOfMonth ? Number(dayOfMonth) : 1;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (y < 1990 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return {
    date: date.toISOString().slice(0, 10),
    precision: dayOfMonth ? 'day' : month ? 'month' : 'year',
    party,
  };
}

/** What the quote must say for each kind, in the languages the sources use. */
const KIND_WORDS: Record<DatedEventPredicate, RegExp> = {
  'deployment.pilot':
    /\b(pilot|pilote|pilots|pilotes|trial|trials|essai|essais|exp[ée]rimentation|experiment|d[ée]ploy(?:ed|ment|ments|[ée]e?s?)|proof[- ]of[- ]concept|poc|pilotprojekt|pilotversuch|prueba piloto)\b/i,
  // A trial, a test or a demonstration already held: the words of the
  // sources in the languages they come in; the second reading checks the sense.
  'demonstration.on_site':
    /\b(trials?|tests?|tested|testing|essais?|exp[ée]riment\w*|d[ée]mo|d[ée]monstrations?|demos?|demonstrations?|demonstrated|pilot|pilote|pilots|pilotes|erprob\w*|vorf[üu]hr\w*|test(?:s|en|et|ing)?|ensayos?|prueba)\b|测试|试验|试点|演示|实证|训练|テスト|実証|実演|デモ|試験|시험|테스트|시연|시범/iu,
  'safety.recall':
    /\b(recall|recalls|recalled|rappel|rappels|rappel[ée]e?s?|retrait|retir[ée]e?s?|withdrawn|withdrawal|safety notice|field safety|avis de s[ée]curit[ée]|r[üu]ckruf|retirada)\b/i,
};

/**
 * A first delivery to customers (task 866/867, ADR-356) is filed as a
 * `deployment.pilot` whose quote says the units were delivered. The word alone
 * is not enough: a quote that only talks about delivery and also carries a
 * word of plan or of the future (« sera livré », « expected to ship ») is a
 * promise, not an event, and is refused.
 */
const DELIVERY_WORDS =
  /(?<![\p{L}\p{N}])(delivered|deliveries|delivering|shipped|shipping|livr[ée]e?s?|livraisons?|ausgeliefert|geliefert|auslieferung|entregad[oa]s?|entregas?)(?![\p{L}\p{N}])/iu;
const FUTURE_WORDS =
  /(?<![\p{L}\p{N}])(will|would|shall|expected|expects|planned|plans?|scheduled|aims?|aiming|upcoming|soon|later|sera|seront|serait|pr[ée]vue?s?|pr[ée]vision|attendue?s?|bient[ôo]t|prochaine?s?|werden|wird|geplant|ser[áa]n?|previst[oa]s?)(?![\p{L}\p{N}])/iu;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The name as a word of the text (not inside another word), accents and case kept apart. */
function namedIn(text: string, name: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(name)}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(text);
}

/**
 * Why a pilot or a recall cannot be kept, or null. The quote must name the
 * client or the authority, say « pilot » or « recall » in some form, and give
 * the year of the event; the date cannot lie in the future (a plan is not an
 * event); a pilot that has no client named is a deployment nobody can check.
 */
export function datedEventIssue(input: {
  readonly predicate: string;
  readonly value: { readonly kind: string; readonly value?: unknown };
  readonly quote: string;
  readonly now?: Date;
  /**
   * Year of the page's own publication date. For a demonstration only: a news
   * page that says « already » without repeating the year still dates it by
   * its own date, which is a sourced date; the event cannot be later than it.
   */
  readonly pageYear?: number | null;
}): string | null {
  if (!isDatedEventPredicate(input.predicate)) return null;
  const event = input.value.kind === 'text' && typeof input.value.value === 'string'
    ? parseDatedEvent(input.value.value)
    : null;
  if (!event) return 'Valeur illisible : écrire « AAAA-MM-JJ|nom » (date de l’événement, puis client ou autorité).';
  const now = input.now ?? new Date();
  if (new Date(event.date).getTime() > now.getTime() + 86_400_000) {
    return 'Date à venir : un projet n’est pas un événement.';
  }
  const quote = normalizeText(input.quote);
  const kindSeen = KIND_WORDS[input.predicate].test(quote);
  const deliverySeen = input.predicate === 'deployment.pilot' && DELIVERY_WORDS.test(quote);
  if (!kindSeen && !deliverySeen) {
    return input.predicate === 'safety.recall'
      ? 'La citation ne parle pas d’un rappel.'
      : input.predicate === 'demonstration.on_site'
        ? 'La citation ne parle pas d’un essai, d’un test ou d’une démonstration.'
        : 'La citation ne parle pas d’un pilote ou d’un déploiement.';
  }
  if (!kindSeen && FUTURE_WORDS.test(quote)) {
    return 'La citation parle d’une livraison prévue, pas d’une livraison qui a eu lieu.';
  }
  if (!namedIn(quote, event.party)) {
    return input.predicate === 'safety.recall'
      ? 'La citation ne nomme pas l’autorité ou le constructeur du rappel.'
      : input.predicate === 'demonstration.on_site'
        ? 'La citation ne nomme pas le lieu ou le client.'
        : 'La citation ne nomme pas le client.';
  }
  const year = event.date.slice(0, 4);
  if (quote.includes(year)) return null;
  // A demonstration with no year in the quote is dated by the page itself, at day precision at most.
  if (input.predicate === 'demonstration.on_site' && input.pageYear === Number(year)) return null;
  return 'La citation ne donne pas l’année de l’événement.';
}
