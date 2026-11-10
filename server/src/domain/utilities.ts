import { z } from 'zod';

/**
 * What a robot is USEFUL FOR (ADR-027, 01/10/2026): the reader's first axis
 * of the directory, above the segment, the form and the household task.
 *
 * A robot has several utilities at once (a humanoid can be a research
 * platform and a general-purpose worker; a companion can also care for a
 * senior), so the value is a list, never a single choice. The household task
 * of ADR-021 (vacuum, mower, pool, windows) becomes the sub-level of the
 * first utilities: `menage` inside, `jardin` outside (mower, pool).
 *
 * Stored in `robot.utilities` with, for each utility, the
 * rule and the words of the sheet that justify it (`robot.utilities_basis`):
 * a utility nobody can justify from the sheet is not attributed.
 *
 * ADR-031 (02/10/2026): twenty-three utilities checked against the whole of
 * robotics (cooking, medical, rehabilitation, delivery, commercial cleaning,
 * construction, agriculture, exploration, telepresence, rescue added;
 * security opened to defence; « Polyvalents » and the fallback « Autres »,
 * so that no published robot is left without one). Migration 0055.
 *
 * Audit of 05/10/2026: « Jardin et extérieur » (`jardin`) splits the outdoor
 * household tasks (lawn mowing, pool cleaning) off `menage`, which keeps the
 * indoor ones. Migration 0123.
 */
export const robotUtilities = [
  'menage',
  'jardin',
  'cuisine',
  'compagnie',
  'education',
  'loisirs',
  'aide-personne',
  'medical',
  'reeducation',
  'recherche',
  'logistique',
  'livraison',
  'accueil',
  'nettoyage-pro',
  'inspection',
  'construction',
  'agriculture',
  'industrie',
  'exploration',
  'telepresence',
  'secours',
  'defense-securite',
  'polyvalent',
  'autres',
] as const;
export type RobotUtility = (typeof robotUtilities)[number];
export const robotUtilitySchema = z.enum(robotUtilities);

/**
 * Keys renamed on 02/10/2026: the old URL of a
 * utility page redirects to the new one, an old API value is still read.
 */
export const legacyUtilityKeys: Readonly<Record<string, RobotUtility>> = {
  securite: 'defense-securite',
  'humanoide-polyvalent': 'polyvalent',
  sante: 'aide-personne',
};

export function isRobotUtility(value: unknown): value is RobotUtility {
  return typeof value === 'string' && (robotUtilities as readonly string[]).includes(value);
}

/** A utility key, an old key read as its new name; null when unknown. */
export function readUtility(value: unknown): RobotUtility | null {
  if (isRobotUtility(value)) return value;
  return typeof value === 'string' ? (legacyUtilityKeys[value] ?? null) : null;
}

/** The values of a database array, keeping only the utilities this code knows, in canonical order. */
export function parseUtilities(value: unknown): RobotUtility[] {
  const given = (Array.isArray(value) ? value : []).map(readUtility);
  return robotUtilities.filter((utility) => given.includes(utility));
}

export interface UtilityLabel {
  readonly fr: string;
  readonly en: string;
  /** One sentence for the page of the utility and for a search engine. */
  readonly descriptionFr: string;
  readonly descriptionEn: string;
}

export const robotUtilityLabels: Readonly<Record<RobotUtility, UtilityLabel>> = {
  menage: {
    fr: 'Ménage et entretien',
    en: 'Housework and upkeep',
    descriptionFr:
      'Aspirateurs et laveurs de sols, lave-vitres et autres robots qui entretiennent l’intérieur de la maison.',
    descriptionEn:
      'Vacuum and floor cleaners, window cleaners and other robots that look after the inside of the home.',
  },
  jardin: {
    fr: 'Jardin et extérieur',
    en: 'Garden and outdoors',
    descriptionFr: 'Robots tondeuses et nettoyeurs de piscine qui entretiennent l’extérieur de la maison.',
    descriptionEn: 'Robot lawn mowers and pool cleaners that look after the outside of the home.',
  },
  cuisine: {
    fr: 'Cuisine',
    en: 'Cooking',
    descriptionFr:
      'Robots qui cuisinent ou préparent des plats et des boissons, à la maison ou en restauration.',
    descriptionEn: 'Robots that cook or prepare meals and drinks, at home or in food service.',
  },
  compagnie: {
    fr: 'Compagnie',
    en: 'Companionship',
    descriptionFr:
      'Robots sociaux et robots de compagnie, faits pour tenir compagnie, réagir et accompagner au quotidien.',
    descriptionEn:
      'Social robots and companion robots, made to keep company, respond and be there day to day.',
  },
  education: {
    fr: 'Éducation et programmation',
    en: 'Education and programming',
    descriptionFr:
      'Robots et kits pour apprendre la robotique et le code, à l’école ou à la maison.',
    descriptionEn: 'Robots and kits for learning robotics and coding, at school or at home.',
  },
  loisirs: {
    fr: 'Loisirs et divertissement',
    en: 'Leisure and entertainment',
    descriptionFr:
      'Jouets robotisés, robots de loisir, robots à construire ou à collectionner et robots de spectacle.',
    descriptionEn: 'Robotic toys, hobby robots, robots to build or collect and show robots.',
  },
  'aide-personne': {
    fr: 'Aide à la personne',
    en: 'Personal care',
    descriptionFr:
      'Robots qui aident les personnes âgées ou dépendantes et les soignants : assistance au quotidien, soins, thérapie.',
    descriptionEn:
      'Robots that help older or dependent people and care workers: daily assistance, care, therapy.',
  },
  medical: {
    fr: 'Médical et chirurgie',
    en: 'Medical and surgery',
    descriptionFr:
      'Robots utilisés à l’hôpital et en clinique : chirurgie assistée, examens, logistique des soins.',
    descriptionEn:
      'Robots used in hospitals and clinics: assisted surgery, examinations, care logistics.',
  },
  reeducation: {
    fr: 'Rééducation et exosquelettes',
    en: 'Rehabilitation and exoskeletons',
    descriptionFr:
      'Exosquelettes et robots de rééducation, pour réapprendre un geste ou soulager le corps au travail.',
    descriptionEn:
      'Exoskeletons and rehabilitation robots, to relearn a movement or relieve the body at work.',
  },
  recherche: {
    fr: 'Recherche et développement',
    en: 'Research and development',
    descriptionFr:
      'Plateformes vendues aux laboratoires, aux universités et aux équipes de développement pour expérimenter et programmer.',
    descriptionEn:
      'Platforms sold to labs, universities and development teams to experiment and program.',
  },
  logistique: {
    fr: 'Logistique et entrepôt',
    en: 'Logistics and warehousing',
    descriptionFr:
      'Robots qui déplacent, trient ou préparent des charges et des commandes en entrepôt ou en usine : AMR, AGV, préparation de commandes.',
    descriptionEn:
      'Robots that move, sort or pick loads and orders in warehouses and factories: AMRs, AGVs, order picking.',
  },
  livraison: {
    fr: 'Livraison',
    en: 'Delivery',
    descriptionFr: 'Robots qui livrent des colis ou des repas, sur le trottoir ou dans un bâtiment.',
    descriptionEn: 'Robots that deliver parcels or meals, on the pavement or inside a building.',
  },
  accueil: {
    fr: 'Accueil et commerce',
    en: 'Reception and retail',
    descriptionFr:
      'Robots qui accueillent, guident ou servent du public : réception, hôtel, restaurant, magasin.',
    descriptionEn:
      'Robots that welcome, guide or serve the public: reception, hotels, restaurants, shops.',
  },
  'nettoyage-pro': {
    fr: 'Nettoyage professionnel',
    en: 'Commercial cleaning',
    descriptionFr:
      'Autolaveuses et robots de nettoyage des bureaux, magasins, gares, hôpitaux et sites industriels.',
    descriptionEn:
      'Scrubber-dryers and cleaning robots for offices, shops, stations, hospitals and industrial sites.',
  },
  inspection: {
    fr: 'Inspection et maintenance',
    en: 'Inspection and maintenance',
    descriptionFr:
      'Robots qui parcourent un site pour le contrôler : ronde d’inspection, relevés, surveillance d’installations.',
    descriptionEn:
      'Robots that walk a site to check it: inspection rounds, readings, monitoring of installations.',
  },
  construction: {
    fr: 'Construction',
    en: 'Construction',
    descriptionFr:
      'Robots de chantier : implantation, maçonnerie, perçage, impression de bâtiments.',
    descriptionEn: 'Construction site robots: layout marking, bricklaying, drilling, printing buildings.',
  },
  agriculture: {
    fr: 'Agriculture',
    en: 'Agriculture',
    descriptionFr:
      'Robots des champs, des vignes, des serres et des élevages : désherbage, récolte, traite.',
    descriptionEn:
      'Robots for fields, vineyards, greenhouses and livestock: weeding, harvesting, milking.',
  },
  industrie: {
    fr: 'Industrie et production',
    en: 'Industry and production',
    descriptionFr:
      'Robots utilisés en usine ou en atelier : bras industriels, cobots, soudage, assemblage, palettisation.',
    descriptionEn:
      'Robots used in factories and workshops: industrial arms, cobots, welding, assembly, palletising.',
  },
  exploration: {
    fr: 'Exploration spatiale et sous-marine',
    en: 'Space and underwater exploration',
    descriptionFr: 'Robots envoyés là où l’humain va peu : espace, planètes, grands fonds.',
    descriptionEn: 'Robots sent where people rarely go: space, other planets, the deep sea.',
  },
  telepresence: {
    fr: 'Téléprésence',
    en: 'Telepresence',
    descriptionFr:
      'Robots qui portent une personne à distance, par la vidéo, dans un bureau, une école ou un hôpital.',
    descriptionEn:
      'Robots that carry a remote person, by video, into an office, a school or a hospital.',
  },
  secours: {
    fr: 'Secours et intervention',
    en: 'Rescue and emergency response',
    descriptionFr:
      'Robots de lutte contre l’incendie, de sauvetage et d’intervention après une catastrophe.',
    descriptionEn: 'Firefighting, search and rescue and disaster response robots.',
  },
  'defense-securite': {
    fr: 'Défense et sécurité',
    en: 'Defence and security',
    descriptionFr:
      'Robots de ronde et de surveillance de sites, et robots militaires ou de défense : robots terrestres, déminage, patrouille.',
    descriptionEn:
      'Patrol and site surveillance robots, and military or defence robots: ground robots, demining, patrol.',
  },
  polyvalent: {
    fr: 'Polyvalents',
    en: 'General purpose',
    descriptionFr:
      'Humanoïdes et manipulateurs mobiles vendus comme généralistes, pour plusieurs métiers et plusieurs tâches.',
    descriptionEn:
      'Humanoids and mobile manipulators sold as generalists, for several jobs and tasks.',
  },
  autres: {
    fr: 'Autres',
    en: 'Other',
    descriptionFr:
      'Robots dont la fiche ne dit pas encore à quoi ils servent, en attendant une source qui le précise.',
    descriptionEn:
      'Robots whose sheet does not say yet what they are for, until a source says it.',
  },
};
