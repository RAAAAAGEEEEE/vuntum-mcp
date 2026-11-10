import { findPredicate } from '../domain/predicates.js';

const KIND_SENTENCE: Record<string, string> = {
  created: 'Entry created',
  published: 'Published',
  value_changed: 'Data updated',
  price_changed: 'Price updated',
  availability_changed: 'Availability updated',
  corrected: 'Corrected',
  retracted: 'Withdrawn',
  unpublished: 'Taken offline',
};

/** « Publication de la fiche « X » » : the quoted name is a robot's, kept as is. */
const QUOTED = '«\\s*([^»]*?)\\s*»';

/**
 * English sentence for a change whose French sentence is one of the code's own
 * (or, failing that, for its kind). `entityType` tells a story from a sheet.
 */
export function changeSummaryEn(input: { kind: string; entityType: string; summaryFr: string }): string {
  const fr = input.summaryFr.trim();

  // Claims accepted: the criterion is named in English (the key, if it is unknown).
  const claim = /^Affirmation acceptée : (\S+)$/.exec(fr);
  if (claim) return `Claim accepted: ${findPredicate(claim[1] as string)?.labels.en ?? claim[1]}`;

  const lightSheet = new RegExp(`^Fiche légère ${QUOTED} : identité seule, non vérifiée$`).exec(fr);
  if (lightSheet) return `Light sheet “${lightSheet[1]}”: identity only, not verified`;

  const sheet = new RegExp(`^Publication de la fiche ${QUOTED}$`).exec(fr);
  if (sheet) return `Sheet published: “${sheet[1]}”`;

  // A story's title is in the story's language: the English page names its own.
  if (input.kind === 'published' && /^Publication de /.test(fr)) {
    return input.entityType === 'article' ? 'Story published' : 'Sheet published';
  }

  if (/^Brève .* corrigée après relecture contre sa source$/.test(fr)) {
    return 'Story corrected after a check against its source';
  }

  return KIND_SENTENCE[input.kind] ?? 'Change recorded';
}
