import { type ClaimSubjectType, type RiskClass, autonomyLevels } from './enums.js';
import type { Dimension } from './units.js';

/**
 * The predicate registry is the backbone that ties extraction, validation,
 * the comparator, the API and MCP together.
 *
 * Adding a fact to Vuntum means adding a predicate here first: there is no way
 * to store a factual value that this registry does not describe.
 */

export type ValueKind = 'number' | 'money' | 'tristate' | 'enum' | 'text' | 'date';

export interface PredicateDefinition {
  readonly key: string;
  readonly valueKind: ValueKind;
  /** Canonical SI unit for `number` predicates. */
  readonly canonicalUnit?: string;
  readonly dimension?: Dimension;
  /** Plausibility bounds, expressed in the canonical unit. */
  readonly bounds?: { readonly min: number; readonly max: number };
  readonly enumValues?: readonly string[];
  readonly labels: { readonly fr: string; readonly en: string };
  /** Column identifier in the comparator, when the predicate is comparable. */
  readonly comparatorColumn?: string;
  readonly comparatorOrder?: number;
  /** Days after which a claim on this predicate is flagged `stale`. */
  readonly freshnessDays: number;
  readonly riskClass: RiskClass;
  readonly subjectTypes: readonly ClaimSubjectType[];
  /** Relative difference under which two claims are considered to agree. */
  readonly conflictTolerance: number;
  /**
   * The robot may truly have several values at once (two SDKs): two distinct
   * accepted values never open a contradiction. The proof rule is
   * unchanged, each value needs its own quote and source. Only set after a
   * measure shows the values really coexist; other list-like candidates
   * (software.ros2_distributions, simulators, languages) stay unset.
   */
  readonly multiValued?: boolean;
  /**
   * Maximum relative change a `trusted_auto` update may apply without a human.
   * `null` means the predicate is never eligible for automatic publication.
   */
  readonly autoUpdateMaxDelta: number | null;
  readonly note?: { readonly fr: string; readonly en: string };
}

const ROBOTISH: readonly ClaimSubjectType[] = ['robot', 'robot_variant'];
const SOFTWARE_SUBJECTS: readonly ClaimSubjectType[] = ['robot', 'robot_variant', 'sdk', 'api', 'repository'];

function def(d: PredicateDefinition): PredicateDefinition {
  return d;
}

/**
 * The conformity marks and standards a sheet may show, with the
 * words a quote must contain for the claim to be kept.
 */
export const COMPLIANCE_MARKS: ReadonlyArray<{
  readonly key: string;
  readonly fr: string;
  readonly en: string;
  /** What the quote must say, read on the original text. */
  readonly pattern: RegExp;
}> = [
  { key: 'compliance.ce', fr: 'Marquage CE', en: 'CE marking', pattern: /(?<![\p{L}\p{N}])(CE|C€)(?![\p{L}\p{N}])|marquage CE|CE[- ]?(mark|marking|certified|certification|conformity|compliant)/u },
  { key: 'compliance.rohs', fr: 'RoHS', en: 'RoHS', pattern: /RoHS/i },
  { key: 'compliance.fcc', fr: 'FCC', en: 'FCC', pattern: /(?<![\p{L}\p{N}])FCC(?![\p{L}])/u },
  { key: 'compliance.ul', fr: 'Certification UL', en: 'UL certification', pattern: /(?<![\p{L}\p{N}])(c?UL(us)?|UL ?\d{3,4}|ETL)(?![\p{L}])/u },
  { key: 'compliance.iso_10218', fr: 'ISO 10218 (robots industriels)', en: 'ISO 10218 (industrial robots)', pattern: /10218/ },
  { key: 'compliance.iso_ts_15066', fr: 'ISO/TS 15066 (cobots)', en: 'ISO/TS 15066 (cobots)', pattern: /15066/ },
  { key: 'compliance.iso_13482', fr: 'ISO 13482 (robots de soins personnels)', en: 'ISO 13482 (personal care robots)', pattern: /13482/ },
  { key: 'compliance.un38_3', fr: 'UN 38.3 (transport des batteries)', en: 'UN 38.3 (battery transport)', pattern: /UN ?38\.3|UN38\.3/i },
];

function complianceDefinitions(): PredicateDefinition[] {
  return [
    def({
      key: 'compliance.ip_rating',
      valueKind: 'text',
      labels: { fr: 'Indice de protection (IP)', en: 'Ingress protection (IP)' },
      freshnessDays: 365, riskClass: 'medium', subjectTypes: ROBOTISH,
      conflictTolerance: 0, autoUpdateMaxDelta: 0,
      note: {
        fr: 'Code IP de la norme CEI 60529 (IP54, IP67…), tel que le fabricant l’écrit.',
        en: 'IEC 60529 IP code (IP54, IP67…), as the maker writes it.',
      },
    }),
    ...COMPLIANCE_MARKS.map((mark) =>
      def({
        key: mark.key,
        valueKind: 'tristate',
        labels: { fr: mark.fr, en: mark.en },
        freshnessDays: 365, riskClass: 'medium', subjectTypes: ROBOTISH,
        conflictTolerance: 0, autoUpdateMaxDelta: 0,
      }),
    ),
  ];
}

const definitions: readonly PredicateDefinition[] = [
  // ---------------------------------------------------------------- price
  def({
    key: 'price.msrp',
    valueKind: 'money',
    labels: { fr: 'Prix public conseillé', en: 'Manufacturer suggested price' },
    comparatorColumn: 'price', comparatorOrder: 10,
    freshnessDays: 30,
    riskClass: 'medium',
    subjectTypes: ROBOTISH,
    conflictTolerance: 0.001,
    autoUpdateMaxDelta: 0.05,
    note: {
      fr: "Toujours rattaché à un marché et à une date d'observation.",
      en: 'Always bound to a market and an observation date.',
    },
  }),
  def({
    key: 'price.estimated',
    valueKind: 'money',
    labels: { fr: 'Prix estimatif du fabricant', en: 'Manufacturer estimated price' },
    freshnessDays: 30,
    riskClass: 'medium',
    subjectTypes: ROBOTISH,
    conflictTolerance: 0.001,
    autoUpdateMaxDelta: null,
    note: {
      fr: "Estimation publiée par le fabricant (« Estimated price »), par palier de quantité, souvent hors taxes et hors livraison ; jamais un prix public ferme, jamais dans une médiane de prix.",
      en: 'Estimate published by the maker (« Estimated price »), by quantity tier, often excluding taxes and shipping; never a firm public price, never in a price median.',
    },
  }),
  def({
    key: 'price.street',
    valueKind: 'money',
    labels: { fr: 'Prix constaté', en: 'Street price' },
    freshnessDays: 30,
    riskClass: 'high',
    subjectTypes: ROBOTISH,
    conflictTolerance: 0.05,
    autoUpdateMaxDelta: null,
  }),
  def({
    key: 'price.preorder_deposit',
    valueKind: 'money',
    labels: { fr: 'Acompte de précommande', en: 'Pre-order deposit' },
    freshnessDays: 30,
    riskClass: 'high',
    subjectTypes: ROBOTISH,
    conflictTolerance: 0.001,
    autoUpdateMaxDelta: null,
  }),
  def({
    key: 'price.subscription_monthly',
    valueKind: 'money',
    labels: { fr: 'Abonnement mensuel', en: 'Monthly subscription' },
    freshnessDays: 30,
    riskClass: 'medium',
    subjectTypes: ROBOTISH,
    conflictTolerance: 0.001,
    autoUpdateMaxDelta: null,
    note: {
      fr: "Montant payé chaque mois à la place ou en plus de l'achat ; jamais un prix d'achat, jamais dans une médiane de prix.",
      en: 'Amount paid every month instead of, or on top of, the purchase; never a purchase price, never in a price median.',
    },
  }),

  // --------------------------------------------------------- availability
  def({
    key: 'availability.state',
    valueKind: 'enum',
    enumValues: ['available', 'preorder', 'waitlist', 'sold_out', 'not_offered', 'unknown'],
    labels: { fr: 'Disponibilité', en: 'Availability' },
    comparatorColumn: 'availability', comparatorOrder: 180,
    freshnessDays: 30,
    riskClass: 'medium',
    subjectTypes: ROBOTISH,
    conflictTolerance: 0,
    autoUpdateMaxDelta: 0,
    note: {
      fr: 'Par marché. Une disponibilité issue d’une source non officielle ne passe jamais en automatique.',
      en: 'Per market. Availability from a non-official source never publishes automatically.',
    },
  }),
  def({
    key: 'availability.first_shipping_date',
    valueKind: 'date',
    labels: { fr: 'Première livraison annoncée', en: 'Announced first shipping date' },
    freshnessDays: 90,
    riskClass: 'medium',
    subjectTypes: ROBOTISH,
    conflictTolerance: 0,
    autoUpdateMaxDelta: null,
  }),

  def({
    // Where the robot stands when it is not on sale: a concept, a prototype, or
    // withdrawn by its maker. It lets the commercial status leave `unknown`
    // for the robots whose maker never writes « available ».
    key: 'lifecycle.stage',
    valueKind: 'enum',
    enumValues: ['concept', 'prototype', 'discontinued'],
    labels: { fr: 'Stade du produit', en: 'Product stage' },
    freshnessDays: 180,
    riskClass: 'medium',
    subjectTypes: ROBOTISH,
    conflictTolerance: 0,
    autoUpdateMaxDelta: 0,
    note: {
      fr: 'Seulement ce que le fabricant écrit : « prototype », « concept », « arrêté », « fin de commercialisation ». Jamais déduit.',
      en: 'Only what the maker writes: « prototype », « concept », « discontinued », « end of life ». Never inferred.',
    },
  }),

  def({
    // The day, month or year the maker first presented the robot (audit of
    // 01/10/2026: `robot.announced_year` was filled for 2 of 49 published
    // robots, no claim could say it). It fills the year by rule.
    key: 'lifecycle.announced_date',
    valueKind: 'date',
    labels: { fr: 'Date d’annonce', en: 'Announcement date' },
    freshnessDays: 3650,
    riskClass: 'low',
    subjectTypes: ROBOTISH,
    conflictTolerance: 0,
    autoUpdateMaxDelta: 0,
  }),

  // ---------------------------------------------------------- dimensions
  def({
    key: 'dimensions.height',
    valueKind: 'number', canonicalUnit: 'm', dimension: 'length',
    bounds: { min: 0.05, max: 4 },
    labels: { fr: 'Hauteur', en: 'Height' },
    comparatorColumn: 'height', comparatorOrder: 30,
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.02, autoUpdateMaxDelta: 0.1,
  }),
  def({
    key: 'dimensions.width',
    valueKind: 'number', canonicalUnit: 'm', dimension: 'length',
    bounds: { min: 0.02, max: 3 },
    labels: { fr: 'Largeur', en: 'Width' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.02, autoUpdateMaxDelta: 0.1,
  }),
  def({
    key: 'dimensions.depth',
    valueKind: 'number', canonicalUnit: 'm', dimension: 'length',
    bounds: { min: 0.02, max: 3 },
    labels: { fr: 'Profondeur', en: 'Depth' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.02, autoUpdateMaxDelta: 0.1,
  }),
  def({
    // Three cotes published without the order being named (« 430 × 400 × 226 mm »,
    // task 1279, ADR-504). Kept as written, never split into height, width or depth.
    key: 'dimensions.envelope',
    valueKind: 'text',
    labels: { fr: 'Dimensions', en: 'Dimensions' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Les trois cotes dans l’ordre de la source, sans dire laquelle est la hauteur. Jamais converties en axes.',
      en: 'The three cotes in the source’s order, without saying which one is the height. Never turned into axes.',
    },
  }),
  def({
    key: 'mass.weight',
    valueKind: 'number', canonicalUnit: 'kg', dimension: 'mass',
    bounds: { min: 0.1, max: 5000 },
    labels: { fr: 'Poids', en: 'Weight' },
    comparatorColumn: 'weight', comparatorOrder: 40,
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.02, autoUpdateMaxDelta: 0.1,
  }),

  // ------------------------------------------------------------- battery
  def({
    key: 'battery.runtime',
    valueKind: 'number', canonicalUnit: 's', dimension: 'duration',
    bounds: { min: 60, max: 86_400 },
    labels: { fr: 'Autonomie', en: 'Battery runtime' },
    comparatorColumn: 'runtime', comparatorOrder: 50,
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.1, autoUpdateMaxDelta: 0.15,
    note: {
      fr: "L'autonomie dépend fortement des conditions de mesure : toujours lire les qualifiers.",
      en: 'Runtime depends heavily on measurement conditions: always read the qualifiers.',
    },
  }),
  def({
    key: 'battery.capacity',
    valueKind: 'number', canonicalUnit: 'Wh', dimension: 'energy',
    bounds: { min: 1, max: 20_000 },
    labels: { fr: 'Capacité batterie', en: 'Battery capacity' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.05, autoUpdateMaxDelta: 0.1,
  }),
  def({
    key: 'battery.charge_time',
    valueKind: 'number', canonicalUnit: 's', dimension: 'duration',
    bounds: { min: 60, max: 86_400 },
    labels: { fr: 'Temps de charge', en: 'Charge time' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.1, autoUpdateMaxDelta: 0.15,
  }),
  def({
    key: 'battery.hot_swap',
    valueKind: 'tristate',
    labels: { fr: 'Batterie remplaçable à chaud', en: 'Hot-swappable battery' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),

  // ------------------------------------------------------------ mobility
  def({
    key: 'mobility.max_speed',
    valueKind: 'number', canonicalUnit: 'm/s', dimension: 'speed',
    bounds: { min: 0.01, max: 20 },
    labels: { fr: 'Vitesse maximale', en: 'Maximum speed' },
    comparatorColumn: 'speed', comparatorOrder: 60,
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.05, autoUpdateMaxDelta: 0.1,
  }),
  def({
    key: 'mobility.type',
    valueKind: 'enum',
    enumValues: ['wheeled', 'biped', 'quadruped', 'tracked', 'stationary_arm', 'hybrid', 'other'],
    labels: { fr: 'Type de locomotion', en: 'Locomotion type' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'mobility.stairs',
    valueKind: 'tristate',
    labels: { fr: 'Monte les escaliers', en: 'Climbs stairs' },
    comparatorColumn: 'stairs', comparatorOrder: 90,
    freshnessDays: 365, riskClass: 'medium', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),

  // ----------------------------------------------------------- mechanics
  def({
    key: 'mechanics.dof_total',
    valueKind: 'number', canonicalUnit: 'count', dimension: 'count',
    bounds: { min: 1, max: 100 },
    labels: { fr: 'Degrés de liberté', en: 'Degrees of freedom' },
    comparatorColumn: 'dof', comparatorOrder: 70,
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'mechanics.dof_per_arm',
    valueKind: 'number', canonicalUnit: 'count', dimension: 'count',
    bounds: { min: 1, max: 30 },
    labels: { fr: 'Degrés de liberté par bras', en: 'Degrees of freedom per arm' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'payload.carry',
    valueKind: 'number', canonicalUnit: 'kg', dimension: 'mass',
    bounds: { min: 0.01, max: 3000 },
    labels: { fr: 'Charge utile', en: 'Payload' },
    comparatorColumn: 'payload', comparatorOrder: 80,
    freshnessDays: 180, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.05, autoUpdateMaxDelta: 0.1,
  }),

  // -------------------------------------------------- industrial arms
  // The fields of an industrial sheet (arm, cobot, AMR/AGV). The payload is
  // `payload.carry`, the protection rating `compliance.ip_rating`.
  def({
    key: 'arm.type',
    valueKind: 'enum',
    enumValues: ['arm', 'cobot', 'amr_agv'],
    labels: { fr: 'Type de robot industriel', en: 'Industrial robot type' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Bras industriel (arm), cobot (cobot) ou robot mobile AMR/AGV (amr_agv), seulement si la page du fabricant le nomme ainsi. Une norme citée n’est pas un type.',
      en: 'Industrial arm (arm), cobot (cobot) or AMR/AGV mobile robot (amr_agv), only when the maker’s page names it so. A cited standard is not a type.',
    },
  }),
  def({
    key: 'arm.reach',
    valueKind: 'number', canonicalUnit: 'm', dimension: 'length',
    bounds: { min: 0.05, max: 10 },
    labels: { fr: 'Portée', en: 'Reach' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.02, autoUpdateMaxDelta: 0.05,
    note: {
      fr: 'Portée maximale du bras, du centre de la base au poignet ou à la bride, telle que le fabricant la donne.',
      en: 'Maximum reach of the arm, as the maker gives it.',
    },
  }),
  def({
    key: 'arm.repeatability',
    valueKind: 'number', canonicalUnit: 'm', dimension: 'length',
    bounds: { min: 0.000001, max: 0.005 },
    labels: { fr: 'Répétabilité', en: 'Repeatability' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.05, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Répétabilité de pose (± mm), au sens de la norme ISO 9283 quand le fabricant la cite.',
      en: 'Pose repeatability (± mm), per ISO 9283 when the maker cites it.',
    },
  }),
  def({
    key: 'arm.max_tcp_speed',
    valueKind: 'number', canonicalUnit: 'm/s', dimension: 'speed',
    bounds: { min: 0.01, max: 20 },
    labels: { fr: 'Vitesse maximale de l’outil', en: 'Maximum tool speed' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.05, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Vitesse de l’outil au bout du bras (TCP), telle que le fabricant la donne. Jamais une vitesse de déplacement : un bras fixe ne se déplace pas.',
      en: 'Speed of the tool at the end of the arm (TCP), as the maker gives it. Never a travel speed: a fixed arm does not travel.',
    },
  }),
  def({
    key: 'arm.axes',
    valueKind: 'number', canonicalUnit: 'count', dimension: 'count',
    bounds: { min: 1, max: 12 },
    labels: { fr: 'Nombre d’axes', en: 'Number of axes' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'arm.mounting',
    valueKind: 'text',
    labels: { fr: 'Montage', en: 'Mounting' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Positions de montage admises (sol, plafond, mur, inclinée), dans les mots du fabricant.',
      en: 'Allowed mounting positions (floor, ceiling, wall, tilted), in the maker’s words.',
    },
  }),
  def({
    key: 'arm.controller',
    valueKind: 'text',
    labels: { fr: 'Contrôleur', en: 'Controller' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'hands.type',
    valueKind: 'enum',
    enumValues: ['none', 'gripper_2f', 'gripper_3f', 'five_fingers', 'modular', 'other'],
    labels: { fr: 'Type de main', en: 'Hand type' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'hands.functional',
    valueKind: 'tristate',
    labels: { fr: 'Mains fonctionnelles', en: 'Functional hands' },
    comparatorColumn: 'hands', comparatorOrder: 100,
    freshnessDays: 365, riskClass: 'medium', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),

  // ---------------------------------------------------------- navigation
  def({
    key: 'navigation.autonomous',
    valueKind: 'tristate',
    labels: { fr: 'Navigation autonome', en: 'Autonomous navigation' },
    comparatorColumn: 'navigation', comparatorOrder: 110,
    freshnessDays: 365, riskClass: 'medium', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'navigation.mapping',
    valueKind: 'enum',
    enumValues: ['none', 'slam_lidar', 'slam_visual', 'marker_based', 'other'],
    labels: { fr: 'Cartographie', en: 'Mapping' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'teleoperation.supported',
    valueKind: 'tristate',
    labels: { fr: 'Téléopération possible', en: 'Teleoperation supported' },
    comparatorColumn: 'teleoperation', comparatorOrder: 150,
    freshnessDays: 365, riskClass: 'medium', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'autonomy.level',
    valueKind: 'enum',
    enumValues: autonomyLevels,
    labels: { fr: "Niveau d'autonomie Vuntum", en: 'Vuntum autonomy level' },
    freshnessDays: 365, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
    note: {
      fr: 'Échelle documentée sur la page méthodologie. Jamais publiée sans Claim validé.',
      en: 'Scale documented on the methodology page. Never published without an accepted claim.',
    },
  }),
  def({
    key: 'tasks.household',
    valueKind: 'tristate',
    labels: { fr: 'Tâches domestiques', en: 'Household tasks' },
    comparatorColumn: 'household', comparatorOrder: 120,
    freshnessDays: 365, riskClass: 'medium', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
  }),

  // ------------------------------------------------------------- sensors
  def({
    key: 'sensors.camera',
    valueKind: 'tristate',
    labels: { fr: 'Caméra', en: 'Camera' },
    comparatorColumn: 'camera', comparatorOrder: 140,
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'sensors.microphone',
    valueKind: 'tristate',
    labels: { fr: 'Microphone', en: 'Microphone' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'sensors.lidar',
    valueKind: 'tristate',
    labels: { fr: 'LiDAR', en: 'LiDAR' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),

  // ------------------------------------------------------------- privacy
  def({
    key: 'privacy.cloud_processing',
    valueKind: 'tristate',
    labels: { fr: 'Traitement dans le cloud', en: 'Cloud processing' },
    comparatorColumn: 'processing', comparatorOrder: 145,
    freshnessDays: 180, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
  }),
  def({
    key: 'privacy.local_processing',
    valueKind: 'tristate',
    labels: { fr: 'Traitement local', en: 'On-device processing' },
    freshnessDays: 180, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
  }),
  def({
    key: 'privacy.human_teleoperator_can_view',
    valueKind: 'tristate',
    labels: {
      fr: 'Un téléopérateur humain peut voir le flux',
      en: 'A human teleoperator can view the stream',
    },
    freshnessDays: 180, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
  }),
  def({
    key: 'privacy.server_location',
    valueKind: 'text',
    labels: { fr: 'Localisation des serveurs', en: 'Server location' },
    freshnessDays: 180, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
  }),
  def({
    key: 'privacy.data_retention',
    valueKind: 'text',
    labels: { fr: 'Conservation des données', en: 'Data retention' },
    freshnessDays: 180, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
  }),

  // ------------------------------------------------------------ software
  def({
    key: 'software.sdk_public',
    valueKind: 'tristate',
    labels: { fr: 'SDK public', en: 'Public SDK' },
    comparatorColumn: 'sdk', comparatorOrder: 160,
    freshnessDays: 180, riskClass: 'medium', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'software.api_cloud',
    valueKind: 'tristate',
    labels: { fr: 'API cloud', en: 'Cloud API' },
    freshnessDays: 180, riskClass: 'medium', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'software.local_control',
    valueKind: 'tristate',
    labels: { fr: 'Contrôle local', en: 'Local control' },
    freshnessDays: 180, riskClass: 'medium', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'software.ros',
    valueKind: 'enum',
    enumValues: ['none', 'ros1', 'ros2', 'both'],
    labels: { fr: 'Compatibilité ROS', en: 'ROS compatibility' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'software.python',
    valueKind: 'tristate',
    labels: { fr: 'API Python', en: 'Python API' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'software.cpp',
    valueKind: 'tristate',
    labels: { fr: 'API C++', en: 'C++ API' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'software.mcp',
    valueKind: 'tristate',
    labels: { fr: 'Compatible MCP', en: 'MCP compatible' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'software.home_assistant',
    valueKind: 'tristate',
    labels: { fr: 'Compatible Home Assistant', en: 'Home Assistant compatible' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'software.os',
    valueKind: 'text',
    labels: { fr: "Système d'exploitation", en: 'Operating system' },
    comparatorColumn: 'os', comparatorOrder: 170,
    freshnessDays: 365, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'software.spoken_languages',
    valueKind: 'text',
    labels: { fr: 'Langues comprises', en: 'Spoken languages' },
    comparatorColumn: 'languages', comparatorOrder: 130,
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  // ------------------------------------------------ programming
  // What a developer, a tinkerer or a prompt writer needs to know before
  // buying: which SDK, which ROS 2 releases, which simulators, whether the
  // cloud is mandatory, whether an AI can drive it in plain language. Every
  // one is a claim like any other (quote, source, evidence level, second
  // reading); "no" only when a source says so, never for "not found".
  def({
    key: 'software.sdk_name',
    valueKind: 'text',
    labels: { fr: 'SDK officiel', en: 'Official SDK' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0, multiValued: true,
    note: {
      fr: 'Nom exact du kit de développement publié par le fabricant (ex. « unitree_sdk2 »).',
      en: 'Exact name of the development kit published by the maker (e.g. "unitree_sdk2").',
    },
  }),
  def({
    key: 'software.open_source',
    valueKind: 'tristate',
    labels: { fr: 'Code du SDK ouvert', en: 'Open-source SDK' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Le code source du SDK est publié sous une licence libre. Un SDK téléchargeable sans son code n’est pas ouvert.',
      en: 'The SDK source code is published under a free licence. A downloadable binary SDK is not open.',
    },
  }),
  def({
    key: 'software.sdk_license',
    valueKind: 'text',
    labels: { fr: 'Licence du SDK', en: 'SDK licence' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'software.ros2_distributions',
    valueKind: 'text',
    labels: { fr: 'Versions de ROS 2 prises en charge', en: 'Supported ROS 2 distributions' },
    freshnessDays: 180, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Distributions nommées par la source (Humble, Jazzy, Kilted, Rolling…).',
      en: 'Distributions named by the source (Humble, Jazzy, Kilted, Rolling…).',
    },
  }),
  def({
    key: 'software.cloud_required',
    valueKind: 'tristate',
    labels: { fr: 'Compte en ligne obligatoire', en: 'Cloud account required' },
    freshnessDays: 180, riskClass: 'medium', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Le robot ne se commande pas sans compte ou serveur du fabricant.',
      en: 'The robot cannot be controlled without the maker’s account or servers.',
    },
  }),
  def({
    key: 'software.alt_firmware',
    valueKind: 'text',
    labels: { fr: 'Micrologiciel alternatif', en: 'Alternative firmware' },
    freshnessDays: 180, riskClass: 'medium', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Nom du micrologiciel libre qui remplace celui du fabricant (ex. Valetudo). Rapporté par son projet, pas par le fabricant.',
      en: 'Name of the free firmware replacing the maker’s (e.g. Valetudo). Reported by its project, not by the maker.',
    },
  }),
  def({
    key: 'software.llm_control',
    valueKind: 'tristate',
    labels: { fr: 'Pilotage en langage naturel par une IA', en: 'Natural-language control by an AI' },
    freshnessDays: 180, riskClass: 'medium', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Un modèle de langage transforme une consigne écrite ou parlée en actions du robot.',
      en: 'A language model turns a written or spoken instruction into robot actions.',
    },
  }),
  def({
    key: 'software.visual_programming',
    valueKind: 'tristate',
    labels: { fr: 'Programmation par blocs', en: 'Block-based programming' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Scratch, Blockly ou un équivalent : programmer sans écrire de code.',
      en: 'Scratch, Blockly or equivalent: programming without writing code.',
    },
  }),
  def({
    key: 'simulation.model_available',
    valueKind: 'tristate',
    labels: { fr: 'Modèle 3D officiel pour la simulation', en: 'Official simulation model' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Description URDF, MJCF ou USD publiée par le fabricant.',
      en: 'URDF, MJCF or USD description published by the maker.',
    },
  }),
  def({
    key: 'simulation.isaac_sim',
    valueKind: 'tristate',
    labels: { fr: 'Simulation dans Isaac Sim', en: 'Isaac Sim simulation' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'simulation.gazebo',
    valueKind: 'tristate',
    labels: { fr: 'Simulation dans Gazebo', en: 'Gazebo simulation' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'simulation.mujoco',
    valueKind: 'tristate',
    labels: { fr: 'Simulation dans MuJoCo', en: 'MuJoCo simulation' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'simulation.webots',
    valueKind: 'tristate',
    labels: { fr: 'Simulation dans Webots', en: 'Webots simulation' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: SOFTWARE_SUBJECTS,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'control.mobile_app',
    valueKind: 'tristate',
    labels: { fr: 'Application mobile officielle', en: 'Official mobile app' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'control.voice_assistant',
    valueKind: 'text',
    labels: { fr: 'Assistants vocaux compatibles', en: 'Compatible voice assistants' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
    note: {
      fr: 'Assistants nommés par la source (Amazon Alexa, Google Assistant, Siri…).',
      en: 'Assistants named by the source (Amazon Alexa, Google Assistant, Siri…).',
    },
  }),
  def({
    key: 'compute.onboard',
    valueKind: 'text',
    labels: { fr: 'Calculateur embarqué', en: 'Onboard compute' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'power.consumption',
    valueKind: 'number', canonicalUnit: 'W', dimension: 'power',
    bounds: { min: 1, max: 10_000 },
    labels: { fr: 'Consommation', en: 'Power consumption' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ROBOTISH,
    conflictTolerance: 0.1, autoUpdateMaxDelta: 0.1,
  }),
  def({
    key: 'warranty.duration',
    valueKind: 'number', canonicalUnit: 's', dimension: 'duration',
    bounds: { min: 86_400, max: 315_569_520 },
    labels: { fr: 'Garantie', en: 'Warranty' },
    comparatorColumn: 'warranty', comparatorOrder: 190,
    freshnessDays: 365, riskClass: 'medium', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'safety.certification',
    valueKind: 'text',
    labels: { fr: 'Certification de sécurité', en: 'Safety certification' },
    freshnessDays: 365, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
  }),

  // ------------------------------- dated events of the proof journal
  // A pilot (deployment named at a client) and an official recall, written
  // `AAAA[-MM[-JJ]]|Nom` (see `dated-event.ts`). High risk: both name a third
  // party, so they pass the code gate and the two readings, and the
  // quote must carry the name, the year and the word (`datedEventIssue`).
  // Shown only in the proof journal, never as a row of the sheet.
  def({
    key: 'deployment.pilot',
    valueKind: 'text',
    labels: { fr: 'Pilote chez un client', en: 'Customer pilot' },
    freshnessDays: 3650, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
    note: {
      fr: 'Un déploiement, un pilote ou une première livraison déjà faite chez un client nommé, avec sa date : « AAAA-MM-JJ|client ». Seulement ce que la page écrit au passé, citation à l’appui.',
      en: 'A deployment, pilot or first delivery already made at a named customer, with its date: « YYYY-MM-DD|customer ». Only what the page writes in the past tense, with the quote.',
    },
  }),
  // Demonstration or trial on site: this robot shown or
  // tested for real, at a named place or client, already happened. It is what
  // lifts a sheet from « paper » to « demo » (`deriveRealityLevel`). Same gate
  // as a pilot, same two readings; the year may come from the page's own date.
  def({
    key: 'demonstration.on_site',
    valueKind: 'text',
    labels: { fr: 'Essai ou démonstration sur site', en: 'On-site trial or demonstration' },
    freshnessDays: 3650, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
    note: {
      fr: 'Un essai, un test ou une démonstration de ce robot en conditions réelles, sur un lieu ou chez un client nommé, avec sa date : « AAAA-MM-JJ|lieu ou client ». Seulement ce que la page écrit, déjà fait, citation à l’appui.',
      en: 'A trial, test or demonstration of this robot in real conditions, at a named place or customer, with its date: « YYYY-MM-DD|place or customer ». Only what the page writes, already done, with the quote.',
    },
  }),
  // Filmed demonstration: what a real video shows this robot doing
  // and whether the source says it was autonomous, teleoperated or says nothing.
  // `AAAA-MM-JJ|autonomous|teleoperated|unknown|tâche`, see `filmed-demo.ts`.
  // Autonomy is never deduced from an announcement; teleoperation is flagged;
  // renders, simulations and concepts are refused. Same gate and two readings.
  def({
    key: 'demonstration.filmed',
    valueKind: 'text',
    labels: { fr: 'Démonstration filmée', en: 'Filmed demonstration' },
    freshnessDays: 3650, riskClass: 'high', subjectTypes: ROBOTISH, multiValued: true,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
    note: {
      fr: 'Une tâche que CE robot est montré en train de faire dans une vidéo réelle (ni image de synthèse ni simulation), avec la date : « AAAA-MM-JJ|mode|tâche », mode = autonomous (la source dit qu’il agit seul), teleoperated (la source dit qu’il est téléopéré) ou unknown (elle ne le dit pas). La tâche est recopiée de la citation.',
      en: 'A task THIS robot is shown doing in real video (no render or simulation), with the date: « YYYY-MM-DD|mode|task », mode = autonomous (the source says it acts alone), teleoperated (the source says it is teleoperated) or unknown (it does not say). The task is copied from the quote.',
    },
  }),
  def({
    key: 'safety.recall',
    valueKind: 'text',
    labels: { fr: 'Rappel officiel', en: 'Official recall' },
    freshnessDays: 3650, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null,
    note: {
      fr: 'Un rappel annoncé par une autorité ou le constructeur, avec sa date : « AAAA-MM-JJ|autorité ». Jamais déduit.',
      en: 'A recall announced by an authority or the maker, with its date: « YYYY-MM-DD|authority ». Never inferred.',
    },
  }),

  // Mission family of a defence robot: the word the public
  // source itself uses (« déminage », « reconnaissance », « logistique »), kept
  // only when the quote carries it (`missionIssue`, `defence.ts`). High risk:
  // it goes through the code gate and the two readings, then a person.
  def({
    key: 'mission.family',
    valueKind: 'text',
    labels: { fr: 'Famille de mission', en: 'Mission family' },
    freshnessDays: 365, riskClass: 'high', subjectTypes: ROBOTISH,
    conflictTolerance: 0, autoUpdateMaxDelta: null, multiValued: true,
    note: {
      fr: 'La famille de mission telle que la source la nomme, en quelques mots recopiés de la citation. Jamais d’armement ni d’emploi tactique.',
      en: 'The mission family as the source names it, a few words copied from the quote. Never weapons or tactical use.',
    },
  }),

  // ---------------------------------------------- compliance
  // Certifications and conformity marks. Stored only from an official source
  // (declaration of conformity, manual, maker's page) whose quote names the
  // mark, and only as « yes »: no source, nothing shown (`complianceIssue`).
  ...complianceDefinitions(),
  def({
    key: 'repository.license',
    valueKind: 'text',
    labels: { fr: 'Licence', en: 'License' },
    freshnessDays: 365, riskClass: 'low', subjectTypes: ['repository', 'sdk', 'api'],
    conflictTolerance: 0, autoUpdateMaxDelta: 0,
  }),
  def({
    key: 'repository.stars',
    valueKind: 'number', canonicalUnit: 'count', dimension: 'count',
    bounds: { min: 0, max: 5_000_000 },
    labels: { fr: 'Étoiles GitHub', en: 'GitHub stars' },
    freshnessDays: 30, riskClass: 'low', subjectTypes: ['repository'],
    conflictTolerance: 0.2, autoUpdateMaxDelta: 1,
  }),
];

const byKey = new Map(definitions.map((d) => [d.key, d]));

export const allPredicates: readonly PredicateDefinition[] = definitions;

export class UnknownPredicateError extends Error {
  constructor(key: string) {
    super(`unknown predicate "${key}"`);
  }
}

export function getPredicate(key: string): PredicateDefinition {
  const found = byKey.get(key);
  if (!found) throw new UnknownPredicateError(key);
  return found;
}

export function findPredicate(key: string): PredicateDefinition | undefined {
  return byKey.get(key);
}

/** Ordered list of comparator columns. */
export const comparatorPredicates: readonly PredicateDefinition[] = definitions
  .filter((d) => d.comparatorColumn !== undefined)
  .sort((a, b) => (a.comparatorOrder ?? 0) - (b.comparatorOrder ?? 0));
