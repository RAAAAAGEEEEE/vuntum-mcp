/**
 * Detector of French text in an English text (task 362, plan of the English
 * edition, ADR-028). One mechanical check shared by the writing of the English
 * fields (hook, summaries, descriptions, conditions: a text read as French is
 * not stored), the integration test of the English pages and the daily check
 * of the worker.
 *
 * A sentence is read as French when it gathers at least two signs among:
 *  - a French function word written in lower case (« est », « dans », « les », « de »),
 *    only words that are not English words;
 *  - a French word beginning a sentence (« Le », « Les »), counted when the
 *    sentence has another sign;
 *  - an elision (« l’ », « qu’ », « j’ »);
 *  - a lower-case word with a French accent (« humanoïde », « température »),
 *    except the few French words English has borrowed (« résumé », « café »).
 * « » outside an original text is a sign on its own: English quotes “ ”.
 *
 * Left out: what is between quotation marks (“…” or "…"; ADR-028, quotations
 * keep their language), an « Original text: … » line, web addresses, e-mail
 * addresses and the names the caller gives (a source called « Les Numériques »).
 * Capitalised words are names (« Le Monde », « Côte d’Ivoire ») and never count
 * alone. It finds, it never corrects.
 */

export interface FrenchSentence {
  /** The sentence as read, trimmed and cut at 240 characters. */
  readonly sentence: string;
  readonly reason: 'words' | 'guillemets';
}

export interface FrenchScanOptions {
  /** Names written as they are whatever the language (a source, a robot, a maker). */
  readonly names?: readonly string[];
}

/** French function words that are not English words, lower case only. */
const FRENCH_WORDS = new Set(
  (
    'le la les de des du une est sont était etait sera serait ont avait avec dans pour sur sous chez entre depuis ' +
    'selon après apres avant pendant contre vers mais donc car puis aussi très tres comme quand lorsque ' +
    'qui que quoi dont où cette cet ces ses leur leurs notre nos votre vos nous vous ils elle elles ' +
    'pas ne jamais toujours encore déjà deja tout tous toute toutes plusieurs autres autre même meme ' +
    'peut peuvent doit doivent fait faire être etre été avoir sans afin ainsi lors au aux ou et en'
  ).split(/\s+/),
);

/** French elisions, lower case: « l’humanoïde », « qu’il ». Not « d’ »: « Côte d’Ivoire ». */
const ELISION = /^(?:l|qu|j|n|s|c|m|t)['’]\p{L}/u;

/** Letters only French has. */
const FRENCH_ACCENT = /[àâçèéêëîïôùûœ]/;

/** French words English has borrowed, written with their accent. */
const BORROWED = new Set(
  (
    'résumé café cliché naïve naïvely fiancé fiancée protégé façade déjà entrée communiqué détente matinée ' +
    'née soirée première risqué sauté purée pâté crème brûlée rosé élite émigré attaché décor ' +
    'blasé passé exposé melée mêlée touché séance sabbé régime ennui à-la-carte'
  ).split(/\s+/),
);

const SENTENCE_END = /(?<=[.!?…])\s+|\n+/u;

function stripQuotations(text: string): string {
  return text
    .replace(/“[^”]*”/g, ' ')
    .replace(/"[^"]*"/g, ' ')
    .replace(/‘[^’]{12,}’/g, ' ');
}

function stripOriginalText(text: string): string {
  // « Original text: “…” » or « Original text: « … » »: the rest of the line is somebody's words.
  return text.replace(/Original text\s*:[^\n]*/gi, ' ');
}

function stripNames(text: string, names: readonly string[]): string {
  let out = text;
  for (const name of [...names].sort((a, b) => b.length - a.length)) {
    if (name.trim().length >= 2) out = out.split(name).join(' ');
  }
  return out;
}

function wordsOf(sentence: string): string[] {
  return sentence.match(/[\p{L}][\p{L}'’-]*/gu) ?? [];
}

function signsIn(sentence: string): number {
  const words = wordsOf(sentence);
  let signs = 0;
  let initial = 0;
  words.forEach((word, index) => {
    const lower = word.toLowerCase();
    const isLower = word === lower;
    if (ELISION.test(word) && isLower) {
      signs++;
      return;
    }
    // « sans-serif », « Peut-être »: the parts of a hyphenated word count one by one.
    const parts = word.split(/[-]/).filter(Boolean);
    for (const part of parts) {
      const partLower = part.toLowerCase();
      const partIsLower = part === partLower;
      if (partIsLower && FRENCH_WORDS.has(part)) {
        signs++;
      } else if (index === 0 && !partIsLower && FRENCH_WORDS.has(partLower) && partLower.length >= 2) {
        initial++;
      } else if (partIsLower && FRENCH_ACCENT.test(part) && !BORROWED.has(part)) {
        signs++;
      }
    }
  });
  return signs + (signs > 0 ? initial : 0);
}

/** The French sentences of an English text, outside quotations, original texts and names. */
export function findFrenchInEnglish(text: string, options: FrenchScanOptions = {}): FrenchSentence[] {
  const found: FrenchSentence[] = [];
  let work = stripOriginalText(text);
  // Web addresses, paths (« /llms.txt?lang=en »), parameters and e-mail addresses are not words.
  work = work.replace(/https?:\/\/\S+/g, ' ').replace(/(?<![\p{L}\p{N}])\/[\w.\-/?=&%]+/gu, ' ').replace(/\S+=\S*/g, ' ').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, ' ');
  // French phrases English has borrowed whole.
  work = work.replace(/à[ -]la[ -]carte|tête-à-tête|déjà vu|cordon bleu|coup d’état|coup d'etat|savoir-faire/gi, ' ');
  work = stripNames(work, options.names ?? []);
  work = stripQuotations(work);
  if (/[«»]/.test(work)) {
    const around = work.split(SENTENCE_END).find((s) => /[«»]/.test(s)) ?? work;
    found.push({ sentence: around.replace(/\s+/g, ' ').trim().slice(0, 240), reason: 'guillemets' });
  }
  for (const raw of work.split(SENTENCE_END)) {
    const sentence = raw.replace(/\s+/g, ' ').trim();
    if (sentence.length < 6 || /[«»]/.test(sentence)) continue;
    if (signsIn(sentence) >= 2) found.push({ sentence: sentence.slice(0, 240), reason: 'words' });
  }
  return found;
}

/** True when the English text holds a French sentence. */
export function containsFrench(text: string, options: FrenchScanOptions = {}): boolean {
  return findFrenchInEnglish(text, options).length > 0;
}
