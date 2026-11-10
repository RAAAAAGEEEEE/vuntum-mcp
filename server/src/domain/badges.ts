import type { CommercialStatus, EvidenceLevel, LifecycleStatus } from './enums.js';

/**
 * Badges are *derived*, never hand-typed. Every badge here states
 * the exact rule that produces it; the same rules are published on the
 * methodology page so a reader can audit them.
 */

export const badgeKeys = [
  'manufacturer_claim',
  'manufacturer_demo',
  'independently_tested',
  'vuntum_tested',
  'unverified',
  'teleoperation',
  'sdk_public',
  'api_cloud',
  'local_control',
  'preorder',
  'available_eu',
  'sample_data',
  'stale_data',
  'disputed',
] as const;

export type BadgeKey = (typeof badgeKeys)[number];

export interface BadgeDefinition {
  readonly key: BadgeKey;
  readonly labelFr: string;
  readonly labelEn: string;
  readonly ruleFr: string;
  readonly tone: 'neutral' | 'positive' | 'caution' | 'warning';
}

export const badgeDefinitions: Record<BadgeKey, BadgeDefinition> = {
  manufacturer_claim: {
    key: 'manufacturer_claim',
    labelFr: 'Annoncé par le fabricant',
    labelEn: 'Manufacturer claim',
    ruleFr: "Le niveau de preuve le plus élevé parmi les Claims validés est « annonce fabricant ».",
    tone: 'neutral',
  },
  manufacturer_demo: {
    key: 'manufacturer_demo',
    labelFr: 'Démonstration fabricant',
    labelEn: 'Manufacturer demo',
    ruleFr: "Le niveau de preuve le plus élevé parmi les Claims validés est « démonstration fabricant ».",
    tone: 'neutral',
  },
  independently_tested: {
    key: 'independently_tested',
    labelFr: 'Test indépendant',
    labelEn: 'Independently tested',
    ruleFr: 'Au moins un Claim validé provient d’un test indépendant.',
    tone: 'positive',
  },
  vuntum_tested: {
    key: 'vuntum_tested',
    labelFr: 'Testé par Vuntum',
    labelEn: 'Tested by Vuntum',
    ruleFr: 'Au moins un Claim validé provient d’une mesure réalisée par Vuntum.',
    tone: 'positive',
  },
  unverified: {
    key: 'unverified',
    labelFr: 'Non vérifié',
    labelEn: 'Unverified',
    ruleFr: 'Aucun Claim validé au-dessus du niveau « non vérifié ».',
    tone: 'warning',
  },
  teleoperation: {
    key: 'teleoperation',
    labelFr: 'Téléopération possible',
    labelEn: 'Teleoperation possible',
    ruleFr: 'Claim validé `teleoperation.supported` = oui.',
    tone: 'caution',
  },
  sdk_public: {
    key: 'sdk_public',
    labelFr: 'SDK public',
    labelEn: 'Public SDK',
    ruleFr: 'Claim validé `software.sdk_public` = oui.',
    tone: 'positive',
  },
  api_cloud: {
    key: 'api_cloud',
    labelFr: 'API cloud',
    labelEn: 'Cloud API',
    ruleFr: 'Claim validé `software.api_cloud` = oui.',
    tone: 'neutral',
  },
  local_control: {
    key: 'local_control',
    labelFr: 'Contrôle local',
    labelEn: 'Local control',
    ruleFr: 'Claim validé `software.local_control` = oui.',
    tone: 'positive',
  },
  preorder: {
    key: 'preorder',
    labelFr: 'Précommande',
    labelEn: 'Pre-order',
    ruleFr: 'Statut commercial `preorder`, ou Claim validé `availability.state` = preorder.',
    tone: 'neutral',
  },
  available_eu: {
    key: 'available_eu',
    labelFr: 'Disponible en Europe',
    labelEn: 'Available in Europe',
    ruleFr:
      'Claim validé `availability.state` = available, issu d’une source officielle, sur un marché UE/EEE.',
    tone: 'positive',
  },
  sample_data: {
    key: 'sample_data',
    labelFr: 'Donnée d’exemple',
    labelEn: 'Sample data',
    ruleFr: 'L’entité ou la valeur est marquée `is_sample`.',
    tone: 'warning',
  },
  stale_data: {
    key: 'stale_data',
    labelFr: 'Donnée périmée',
    labelEn: 'Stale data',
    ruleFr: 'Au moins un Claim affiché dépasse le délai de fraîcheur de son prédicat.',
    tone: 'caution',
  },
  disputed: {
    key: 'disputed',
    labelFr: 'Contesté',
    labelEn: 'Disputed',
    ruleFr: 'Au moins un Claim affiché est en état `disputed`.',
    tone: 'warning',
  },
};

/** EU / EEA market codes used by the "Disponible en Europe" rule. */
export const EU_EEA_MARKETS = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO',
  'EU', 'EEA',
]);

export interface BadgeFactInput {
  readonly predicate: string;
  readonly evidenceLevel: EvidenceLevel;
  readonly lifecycleStatus: LifecycleStatus;
  readonly stale: boolean;
  readonly sourceIsOfficial: boolean;
  readonly market?: string | undefined;
  /** Rendered tri-state or enum value; numbers are irrelevant to badges. */
  readonly simpleValue?: string | undefined;
}

export interface BadgeSubjectInput {
  readonly isSample: boolean;
  readonly commercialStatus: CommercialStatus;
  readonly facts: readonly BadgeFactInput[];
}

const EVIDENCE_ORDER: EvidenceLevel[] = [
  'unverified',
  'manufacturer_claim',
  'manufacturer_demo',
  'independently_reported',
  'independently_tested',
  'vuntum_tested',
];

export function deriveBadges(subject: BadgeSubjectInput): BadgeKey[] {
  const badges = new Set<BadgeKey>();
  const facts = subject.facts;

  if (subject.isSample) badges.add('sample_data');
  if (facts.some((f) => f.stale)) badges.add('stale_data');
  if (facts.some((f) => f.lifecycleStatus === 'disputed')) badges.add('disputed');

  const best = facts.reduce<EvidenceLevel>((acc, f) => {
    return EVIDENCE_ORDER.indexOf(f.evidenceLevel) > EVIDENCE_ORDER.indexOf(acc) ? f.evidenceLevel : acc;
  }, 'unverified');

  if (facts.length === 0 || best === 'unverified') badges.add('unverified');
  else if (best === 'vuntum_tested') badges.add('vuntum_tested');
  else if (best === 'independently_tested') badges.add('independently_tested');
  else if (best === 'manufacturer_demo') badges.add('manufacturer_demo');
  else if (best === 'manufacturer_claim') badges.add('manufacturer_claim');

  if (facts.some((f) => f.evidenceLevel === 'independently_tested')) badges.add('independently_tested');
  if (facts.some((f) => f.evidenceLevel === 'vuntum_tested')) badges.add('vuntum_tested');

  const yes = (predicate: string): boolean =>
    facts.some((f) => f.predicate === predicate && f.simpleValue === 'yes');

  if (yes('teleoperation.supported')) badges.add('teleoperation');
  if (yes('software.sdk_public')) badges.add('sdk_public');
  if (yes('software.api_cloud')) badges.add('api_cloud');
  if (yes('software.local_control')) badges.add('local_control');

  const availability = facts.filter((f) => f.predicate === 'availability.state');
  if (
    subject.commercialStatus === 'preorder' ||
    availability.some((f) => f.simpleValue === 'preorder')
  ) {
    badges.add('preorder');
  }
  if (
    availability.some(
      (f) =>
        f.simpleValue === 'available' &&
        f.sourceIsOfficial &&
        f.market !== undefined &&
        EU_EEA_MARKETS.has(f.market),
    )
  ) {
    badges.add('available_eu');
  }

  return [...badges];
}
