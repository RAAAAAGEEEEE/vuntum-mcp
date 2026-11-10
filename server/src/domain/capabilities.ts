import { z } from 'zod';

/**
 * What a robot is SHOWN to do: the capabilities of the directory's
 * filter, each tied to an accepted claim, and through it to a source (a quote,
 * a page, and when there is one a validated video).
 *
 * A capability is never read from a category or a form. It comes from the view
 * `public_robot_capability`, which holds the rules, one per
 * capability, over the public claims only. The key names below are the values
 * of the `capacite` parameter of the directory and of `capability` in the API.
 */
export const robotCapabilities = [
  'marcher',
  'courir',
  'escaliers',
  'se-relever',
  'saisir',
  'plier-linge',
  'ranger',
  'navigation',
  'parler',
] as const;
export type RobotCapability = (typeof robotCapabilities)[number];
export const robotCapabilitySchema = z.enum(robotCapabilities);

export interface CapabilityLabel {
  /** The chip of the filter. */
  readonly fr: string;
  readonly en: string;
  /** The claim that makes the capability true, in a few words (documentation, tooltip). */
  readonly basisFr: string;
  readonly basisEn: string;
}

export const robotCapabilityLabels: Readonly<Record<RobotCapability, CapabilityLabel>> = {
  marcher: {
    fr: 'Marcher',
    en: 'Walk',
    basisFr: 'Affirmation validée : locomotion à pattes (bipède ou quadrupède).',
    basisEn: 'Accepted claim: legged locomotion (biped or quadruped).',
  },
  courir: {
    fr: 'Courir',
    en: 'Run',
    basisFr: 'Affirmation validée sur la vitesse maximale dont la citation parle de course.',
    basisEn: 'Accepted maximum-speed claim whose quote speaks of running.',
  },
  escaliers: {
    fr: 'Monter des escaliers',
    en: 'Climb stairs',
    basisFr: 'Affirmation validée « monte les escaliers : oui ».',
    basisEn: 'Accepted claim « climbs stairs: yes ».',
  },
  'se-relever': {
    fr: 'Se relever après une chute',
    en: 'Get up after a fall',
    basisFr: 'Affirmation validée dont la citation décrit le redressement après une chute.',
    basisEn: 'Accepted claim whose quote describes getting back up after a fall.',
  },
  saisir: {
    fr: 'Saisir des objets',
    en: 'Grasp objects',
    basisFr: 'Affirmation validée « mains fonctionnelles : oui ».',
    basisEn: 'Accepted claim « functional hands: yes ».',
  },
  'plier-linge': {
    fr: 'Plier du linge',
    en: 'Fold laundry',
    basisFr: 'Affirmation validée dont la citation décrit le pliage du linge.',
    basisEn: 'Accepted claim whose quote describes folding laundry.',
  },
  ranger: {
    fr: 'Ranger',
    en: 'Tidy up',
    basisFr: 'Affirmation validée dont la citation décrit le rangement.',
    basisEn: 'Accepted claim whose quote describes tidying up.',
  },
  navigation: {
    fr: 'Se déplacer seul',
    en: 'Navigate on its own',
    basisFr: 'Affirmation validée « navigation autonome : oui ».',
    basisEn: 'Accepted claim « autonomous navigation: yes ».',
  },
  parler: {
    fr: 'Parler',
    en: 'Talk',
    basisFr: 'Affirmation validée sur les langues comprises.',
    basisEn: 'Accepted claim on the languages understood.',
  },
};
