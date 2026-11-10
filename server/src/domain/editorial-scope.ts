import { editorialScopeData } from './editorial-scope-data.js';

/**
 * The editorial scope of Vuntum: what is followed first, what is followed
 * less, what is no longer followed (`editorial-scope-data.ts`, a copy of the
 * text published on the methodology pages of vuntum.com). The MCP reads it in
 * `get_editorial_scope`, `get_methodology` and the server instructions.
 */
export const editorialScope = editorialScopeData;

export type ScopeLocale = 'fr' | 'en';
export type ScopeTier = 'priority' | 'less' | 'excluded';

export function scopeTierText(tier: ScopeTier, locale: ScopeLocale): { title: string; text: string } {
  return editorialScope.tiers[tier][locale];
}

/** `YYYY-MM-DD` date of the last update of the scope. */
export const EDITORIAL_SCOPE_UPDATED_ON: string = editorialScope.updatedOn;

/** The whole scope as one answer, in one language (MCP `get_editorial_scope`). */
export function editorialScopeAnswer(locale: ScopeLocale) {
  return {
    locale,
    updatedOn: EDITORIAL_SCOPE_UPDATED_ON,
    followedFirst: scopeTierText('priority', locale),
    followedLess: scopeTierText('less', locale),
    noLongerFollowed: scopeTierText('excluded', locale),
    note:
      locale === 'fr'
        ? 'Le périmètre ne change pas les règles de preuve : un robot suivi moins reçoit les mêmes contrôles, plus tard.'
        : 'The scope does not change the rules of proof: a robot followed less gets the same checks, later.',
  };
}

/** One sentence per tier for the server instructions of the MCP (English, short). */
export function editorialScopeInstruction(): string {
  return (
    `Editorial scope (updated ${EDITORIAL_SCOPE_UPDATED_ON}): ${editorialScope.tiers.priority.en.title.toLowerCase()}: humanoids and physical AI; ` +
    `${editorialScope.tiers.less.en.title.toLowerCase()}: non-humanoid vacuum cleaners, simple lawn mowers and other small household robots; ` +
    `${editorialScope.tiers.excluded.en.title.toLowerCase()}: defence (never published automatically). Call \`get_editorial_scope\` for the details.`
  );
}
