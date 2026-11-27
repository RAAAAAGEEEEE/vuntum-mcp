/**
 * Addresses of the ranking pages (`/classements/<slug>`, ADR-058), in both
 * languages. The list is static: a page exists only when the data allows it
 * (lib/rankings.ts), but its address is always the same and the proxy can
 * translate it without reading the database.
 */

export type RankingCriterion = 'weight' | 'speed' | 'payload';
export type RankingAbility = 'stairs' | 'ros' | 'sdk';
/** Price bands are written in the price's own currency, never converted (mission §6.3). */
export const BUDGET_CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type BudgetCurrency = (typeof BUDGET_CURRENCIES)[number];
/** Upper limits of the bands, in the currency's own unit: under 500, 500 to 2 000, and so on. */
export const BUDGET_LIMITS: readonly number[] = [500, 2_000, 10_000, 50_000];

export const RANKING_CRITERIA: readonly RankingCriterion[] = ['weight', 'speed', 'payload'];
export const RANKING_ABILITIES: readonly RankingAbility[] = ['stairs', 'ros', 'sdk'];

/** Forms (types) that get their own rankings: key (category slug) to the words of their address. */
export const RANKING_FORMS: Readonly<Record<string, { fr: string; en: string }>> = {
  humanoide: { fr: 'humanoides', en: 'humanoids' },
  quadrupede: { fr: 'quadrupedes', en: 'quadrupeds' },
  domestique: { fr: 'domestiques', en: 'home-robots' },
  roues: { fr: 'a-roues', en: 'wheeled' },
  bras: { fr: 'bras', en: 'arms' },
  'manipulateur-mobile': { fr: 'manipulateurs-mobiles', en: 'mobile-manipulators' },
};

/** Uses that get their own rankings (the others are fallbacks or sensitive, ADR-031). */
export const RANKING_USES: Readonly<Record<string, { fr: string; en: string }>> = {
  menage: { fr: 'menage', en: 'housework' },
  recherche: { fr: 'recherche', en: 'research' },
  education: { fr: 'education', en: 'education' },
  loisirs: { fr: 'loisirs', en: 'leisure' },
  inspection: { fr: 'inspection', en: 'inspection' },
  logistique: { fr: 'logistique', en: 'logistics' },
  industrie: { fr: 'industrie', en: 'industry' },
  accueil: { fr: 'accueil', en: 'reception' },
};

const CRITERION_WORDS: Readonly<Record<RankingCriterion, { fr: string; en: string }>> = {
  weight: { fr: 'plus-legers', en: 'lightest' },
  speed: { fr: 'plus-rapides', en: 'fastest' },
  payload: { fr: 'plus-forte-charge', en: 'highest-payload' },
};

const ABILITY_WORDS: Readonly<Record<RankingAbility, { fr: string; en: string }>> = {
  stairs: { fr: 'escaliers', en: 'stairs' },
  ros: { fr: 'compatibles-ros', en: 'ros-compatible' },
  sdk: { fr: 'sdk-public', en: 'public-sdk' },
};

export type RankingKey =
  | { readonly kind: 'ranking'; readonly criterion: RankingCriterion; readonly group: RankingGroup }
  | { readonly kind: 'ability'; readonly ability: RankingAbility }
  | { readonly kind: 'budget'; readonly currency: BudgetCurrency; readonly band: number };

/** Never « all robots »: a vacuum cleaner and a humanoid answer no common question. */
export type RankingGroup =
  | { readonly kind: 'form'; readonly slug: string }
  | { readonly kind: 'use'; readonly slug: string };

export interface RankingSlugs {
  readonly key: RankingKey;
  readonly fr: string;
  readonly en: string;
}

/** The band's address: `moins-de-500-usd`, `500-2000-usd`, `plus-de-50000-usd`. */
function bandWords(currency: BudgetCurrency, band: number): { fr: string; en: string } {
  const code = currency.toLowerCase();
  const low = band === 0 ? null : BUDGET_LIMITS[band - 1];
  const high = BUDGET_LIMITS[band] ?? null;
  if (low === null || low === undefined) return { fr: `moins-de-${high}-${code}`, en: `under-${high}-${code}` };
  if (high === null) return { fr: `plus-de-${low}-${code}`, en: `over-${low}-${code}` };
  return { fr: `${low}-${high}-${code}`, en: `${low}-${high}-${code}` };
}

function groupWords(group: RankingGroup): { fr: string; en: string } {
  if (group.kind === 'form') return RANKING_FORMS[group.slug] ?? { fr: group.slug, en: group.slug };
  const use = RANKING_USES[group.slug] ?? { fr: group.slug, en: group.slug };
  return { fr: `usage-${use.fr}`, en: `use-${use.en}` };
}

/** Every ranking address the site can serve, whether or not the data supports the page today. */
export function allRankingSlugs(): RankingSlugs[] {
  const groups: RankingGroup[] = [
    ...Object.keys(RANKING_FORMS).map((slug) => ({ kind: 'form' as const, slug })),
    ...Object.keys(RANKING_USES).map((slug) => ({ kind: 'use' as const, slug })),
  ];
  const out: RankingSlugs[] = [];
  for (const group of groups) {
    for (const criterion of RANKING_CRITERIA) {
      const g = groupWords(group);
      const c = CRITERION_WORDS[criterion];
      out.push({
        key: { kind: 'ranking', criterion, group },
        fr: `${g.fr}-${c.fr}`,
        en: `${c.en}-${g.en}`,
      });
    }
  }
  for (const ability of RANKING_ABILITIES) {
    out.push({
      key: { kind: 'ability', ability },
      fr: `robots-${ABILITY_WORDS[ability].fr}`,
      en: `robots-${ABILITY_WORDS[ability].en}`,
    });
  }
  for (const currency of BUDGET_CURRENCIES) {
    for (let band = 0; band <= BUDGET_LIMITS.length; band += 1) {
      const words = bandWords(currency, band);
      out.push({ key: { kind: 'budget', currency, band }, fr: `budget-${words.fr}`, en: `budget-${words.en}` });
    }
  }
  return out;
}

const SLUGS = allRankingSlugs();
const FR_TO_EN = new Map(SLUGS.map((entry) => [entry.fr, entry.en]));
const EN_TO_FR = new Map(SLUGS.map((entry) => [entry.en, entry.fr]));

export function rankingSlugEn(fr: string): string {
  return FR_TO_EN.get(fr) ?? fr;
}

export function rankingSlugFr(en: string): string {
  return EN_TO_FR.get(en) ?? en;
}

/** The ranking an address stands for (French address), or null. */
export function rankingFromSlug(fr: string): RankingSlugs | null {
  return SLUGS.find((entry) => entry.fr === fr) ?? null;
}
