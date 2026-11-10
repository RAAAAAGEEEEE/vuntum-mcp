/**
 * The texts of the methodology page, French and English side by side,
 * kept here so the website (`/fr/methodologie`, `/en/methodology`) and the MCP
 * server (`get_methodology`, which runs from the packages alone) read the same
 * sentences: the method is written once. The reality levels and the word
 * « Estimation Vuntum » that the page also shows are here for the same reason.
 */
interface Message {
  readonly fr: string;
  readonly en: string;
}

export const methodologyMessages = {
  'compare.estimate': { fr: 'Estimation Vuntum', en: 'Vuntum estimate' },
  'reality.deployed': { fr: 'Déployé', en: 'Deployed' },
  'reality.pilot': { fr: 'Pilote', en: 'Pilot' },
  'reality.demo': { fr: 'Démo', en: 'Demo' },
  'reality.paper': { fr: 'Annonce papier', en: 'Announced only' },
  'reality.rule.deployed': {
    fr: 'En vente : statut commercial « en livraison » et une disponibilité validée, avec sa source.',
    en: 'Available to buy: commercial status “shipping” and a validated availability claim, with its source.',
  },
  'reality.rule.pilot': {
    fr: 'Livraisons limitées : statut « livraison limitée » et une disponibilité validée.',
    en: 'Limited deliveries: status “limited shipping” and a validated availability claim.',
  },
  'reality.rule.demo': {
    fr: 'Vu en fonctionnement : au moins une valeur validée repose sur une démonstration ou un test.',
    en: 'Seen working: at least one validated value rests on a demonstration or a test.',
  },
  'reality.rule.paper': {
    fr: 'Annoncé seulement : Vuntum n’a pas encore enregistré de preuve de démonstration ou de vente.',
    en: 'Announced only: Vuntum has not yet recorded any proof of a demonstration or a sale.',
  },
  'methodology.metaDescription': {
    fr: 'Comment Vuntum vérifie une information : affirmations sourcées, niveaux de preuve, délais de fraîcheur, score de confiance et règles de publication.',
    en: 'How Vuntum verifies information: sourced claims, levels of evidence, freshness limits, the confidence score and the rules of publication.',
  },

  // The five lines at the top of the page: where figures come from, the levels
  // of evidence, the levels of reality, the role of AI, and the Vuntum tests
  // (that last line is computed from the data, see `methodology.vuntumTested*`).
  'methodology.summaryTitle': {
    fr: 'L’essentiel en cinq lignes',
    en: 'At a glance',
  },
  'methodology.summary1': {
    fr: '**D’où viennent les chiffres.** Chaque valeur est reprise d’une source citée mot pour mot, avec sa date de publication et sa date de consultation. Sans preuve, la case reste vide : « non communiqué ».',
    en: '**Where the figures come from.** Every value is taken from a source quoted word for word, with its publication date and its retrieval date. With no proof, the cell stays empty: “not disclosed”.',
  },
  'methodology.summary2': {
    fr: '**Quatre niveaux de preuve.** Annoncé par le fabricant, montré par le fabricant dans une démonstration, rapporté par un tiers indépendant, mesuré lors d’un test indépendant. Le niveau est affiché à côté de la valeur.',
    en: '**Four levels of evidence.** Stated by the manufacturer, shown by the manufacturer in a demonstration, reported by an independent third party, measured in an independent test. The level is shown next to the value.',
  },
  'methodology.summary3': {
    fr: '**Quatre stades pour le robot.** Déployé (en vente), pilote (livraisons limitées), démo (vu en fonctionnement), annonce papier (annoncé seulement : ni démonstration ni vente connues).',
    en: '**Four stages for the robot.** Deployed (available to buy), pilot (limited deliveries), demo (seen working), announced only (no known demonstration or sale).',
  },
  'methodology.summary4': {
    fr: '**Qui écrit.** Des outils d’IA trient les sources et rédigent les brèves et les articles, sous la supervision de l’éditeur, qui vérifie après coup. Une erreur signalée est corrigée, et la correction est publiée avec sa date dans le [journal des corrections](~/corrections). Chaque texte rédigé avec l’IA porte une mention près de sa date, avec un lien vers cette page.',
    en: '**Who writes.** AI tools sort the sources and write the briefs and articles, under the supervision of the editor, who checks afterwards. A reported error is corrected, and the correction is published with its date in the [corrections log](~/corrections). Every text written with AI carries a note next to its date, linking to this page.',
  },
  'methodology.vuntumTestedNone': {
    fr: '**Tests Vuntum.** Aucun test Vuntum publié à ce jour : aucune valeur du site n’est mesurée par Vuntum lui-même.',
    en: '**Vuntum tests.** No Vuntum test published to date: no value on the site is measured by Vuntum itself.',
  },
  'methodology.vuntumTestedSome.one': {
    fr: '**Tests Vuntum.** {count} valeur publiée a été mesurée par Vuntum lui-même ; toutes les autres viennent de sources extérieures.',
    en: '**Vuntum tests.** {count} published value was measured by Vuntum itself; all the others come from outside sources.',
  },
  'methodology.vuntumTestedSome.other': {
    fr: '**Tests Vuntum.** {count} valeurs publiées ont été mesurées par Vuntum lui-même ; toutes les autres viennent de sources extérieures.',
    en: '**Vuntum tests.** {count} published values were measured by Vuntum itself; all the others come from outside sources.',
  },
  'methodology.vuntumTestedRow': {
    fr: 'Aucune valeur à ce niveau pour l’instant.',
    en: 'No value at this level yet.',
  },
  'methodology.detailSummary': { fr: 'Détail technique', en: 'Technical detail' },
  'methodology.detailIntro': {
    fr: 'Pour les développeurs et les lecteurs qui veulent recalculer : formule du score, délais de fraîcheur par critère avec le nom de chaque critère dans l’API, règles des badges.',
    en: 'For developers and readers who want to recompute: the score formula, freshness limits by criterion with each criterion’s name in the API, and the badge rules.',
  },

  'methodology.principleTitle': {
    fr: 'Le principe : une valeur, une preuve',
    en: 'The principle: one value, one piece of evidence',
  },
  // The first and the last part of one paragraph, around an emphasised
  // « non communiqué » (RichText has no italics). The tail starts with the
  // space the French colon needs.
  'methodology.principleLead': {
    fr: 'Chaque valeur publiée sur Vuntum est une **affirmation** reliée à une citation exacte d’une source identifiée, à une date de publication et à une date de consultation. Une valeur sans affirmation validée n’est jamais affichée. Une case vide signifie',
    en: 'Every value published on Vuntum is a **claim** tied to an exact quote from an identified source, to a publication date and to a date of retrieval. A value without a validated claim is never displayed. An empty cell means',
  },
  'methodology.notDisclosed': { fr: 'non communiqué', en: 'Not disclosed' },
  'methodology.principleTail': {
    fr: ' : ce n’est pas une réponse négative.',
    en: ': it is not a negative answer.',
  },
  'methodology.principleLinks': {
    fr: 'La [liste des sources et de leur score de confiance](~/sources) est publique, comme le [journal des erreurs corrigées](~/corrections). Qui publie Vuntum, et avec quels moyens : voir la [présentation de la rédaction](~/a-propos).',
    en: 'The [list of sources and their confidence scores](~/sources) is public, as is the [log of corrected errors](~/corrections). For who publishes Vuntum, and with what resources, see the [presentation of the editorial team](~/a-propos).',
  },

  'methodology.evidenceTitle': { fr: 'Niveaux de preuve', en: 'Levels of evidence' },
  'methodology.evidenceCaption': {
    fr: 'Poids utilisé dans le calcul de confiance',
    en: 'Weight used in the confidence calculation',
  },
  'methodology.colLevel': { fr: 'Niveau', en: 'Level' },
  'methodology.colMeaning': { fr: 'Signification', en: 'Meaning' },
  'methodology.colWeight': { fr: 'Poids', en: 'Weight' },
  'methodology.evidenceManufacturerClaim': { fr: 'Annonce fabricant', en: 'Manufacturer claim' },
  'methodology.evidenceManufacturerClaimText': {
    fr: 'Le fabricant l’affirme. Aucune vérification indépendante.',
    en: 'The manufacturer states it. No independent verification.',
  },
  'methodology.evidenceManufacturerDemo': {
    fr: 'Démonstration fabricant',
    en: 'Manufacturer demonstration',
  },
  'methodology.evidenceManufacturerDemoText': {
    fr: 'Montré dans une démonstration. Conditions non contrôlées.',
    en: 'Shown in a demonstration. Conditions not controlled.',
  },
  'methodology.evidenceReported': {
    fr: 'Rapporté indépendamment',
    en: 'Independently reported',
  },
  'methodology.evidenceReportedText': {
    fr: 'Rapporté par un tiers indépendant.',
    en: 'Reported by an independent third party.',
  },
  'methodology.evidenceTested': { fr: 'Test indépendant', en: 'Independent test' },
  'methodology.evidenceTestedText': {
    fr: 'Mesuré lors d’un test tiers.',
    en: 'Measured in a third-party test.',
  },
  'methodology.evidenceVuntum': { fr: 'Testé par Vuntum', en: 'Tested by Vuntum' },
  'methodology.evidenceVuntumText': {
    fr: 'Mesuré par Vuntum lui-même.',
    en: 'Measured by Vuntum itself.',
  },
  'methodology.evidenceUnverified': { fr: 'Non vérifié', en: 'Unverified' },
  'methodology.evidenceUnverifiedText': {
    fr: 'Aucun niveau de preuve établi.',
    en: 'No level of evidence established.',
  },
  'methodology.statusesOverride': {
    fr: 'Deux statuts priment sur le niveau de preuve : **contesté** (deux sources crédibles se contredisent) et **périmé** (la dernière vérification dépasse le délai de fraîcheur du critère).',
    en: 'Two statuses override the level of evidence: **disputed** (two credible sources contradict each other) and **stale** (the last check is older than the freshness limit of the criterion).',
  },

  'methodology.scoreTitle': { fr: 'Score de confiance', en: 'Confidence score' },
  'methodology.scoreIntro': {
    fr: 'Le score est déterministe et explicable. Il ne dépend d’aucune impression de modèle :',
    en: 'The score is deterministic and explainable. It does not depend on any impression formed by a model:',
  },
  'methodology.scoreFormula': {
    fr: 'confiance = 0,40 × confiance de la source + 0,35 × niveau de preuve + 0,15 × corroborations indépendantes + 0,10 × fraîcheur',
    en: 'confidence = 0.40 x source confidence + 0.35 x level of evidence + 0.15 x independent corroborations + 0.10 x freshness',
  },

  'methodology.autonomyTitle': { fr: 'Échelle d’autonomie Vuntum', en: 'Vuntum autonomy scale' },
  'methodology.autonomyCaption': {
    fr: 'Échelle utilisée pour le critère niveau d’autonomie',
    en: 'Scale used for the autonomy level criterion',
  },
  'methodology.colDefinition': { fr: 'Définition', en: 'Definition' },
  'methodology.autonomyA0': { fr: 'A0 - Téléopéré', en: 'A0 - Teleoperated' },
  'methodology.autonomyA0Text': {
    fr: 'Un humain commande chaque mouvement en direct.',
    en: 'A human commands every movement live.',
  },
  'methodology.autonomyA1': { fr: 'A1 - Assisté', en: 'A1 - Assisted' },
  'methodology.autonomyA1Text': {
    fr: 'Le robot stabilise et sécurise, l’humain décide de l’action.',
    en: 'The robot stabilises and secures its movements; the human decides on the action.',
  },
  'methodology.autonomyA2': { fr: 'A2 - Tâches scriptées', en: 'A2 - Scripted tasks' },
  'methodology.autonomyA2Text': {
    fr: 'Le robot exécute seul des séquences préprogrammées dans un environnement connu.',
    en: 'The robot carries out preprogrammed sequences on its own in a known environment.',
  },
  'methodology.autonomyA3': {
    fr: 'A3 - Autonomie supervisée',
    en: 'A3 - Supervised autonomy',
  },
  'methodology.autonomyA3Text': {
    fr: 'Le robot enchaîne des tâches seul, un humain surveille et reprend la main.',
    en: 'The robot chains tasks together on its own; a human watches and takes over when needed.',
  },
  'methodology.autonomyA4': { fr: 'A4 - Autonomie de tâche', en: 'A4 - Task autonomy' },
  'methodology.autonomyA4Text': {
    fr: 'Le robot accomplit une tâche complète sans supervision dans un environnement ouvert.',
    en: 'The robot completes a whole task without supervision in an open environment.',
  },
  'methodology.autonomyA5': {
    fr: 'A5 - Autonomie généraliste',
    en: 'A5 - General-purpose autonomy',
  },
  'methodology.autonomyA5Text': {
    fr: 'Le robot accomplit des tâches nouvelles sans instruction spécifique. Aucun produit connu.',
    en: 'The robot performs new tasks without specific instructions. No known product.',
  },

  'methodology.freshnessTitle': {
    fr: 'Délais de fraîcheur par critère',
    en: 'Freshness limits by criterion',
  },
  'methodology.freshnessCaption': {
    fr: 'Au-delà de ce délai, la valeur est signalée comme périmée',
    en: 'Beyond this limit, the value is flagged as stale',
  },
  'methodology.colCriterion': { fr: 'Critère', en: 'Criterion' },
  'methodology.colUnit': { fr: 'Unité', en: 'Unit' },
  'methodology.colFreshness': { fr: 'Fraîcheur (jours)', en: 'Freshness (days)' },
  'methodology.colRisk': { fr: 'Classe de risque', en: 'Risk class' },
  'methodology.apiKey': {
    fr: 'Clé dans l’API : `{key}`',
    en: 'Key in the API: `{key}`',
  },
  'methodology.riskLow': { fr: 'Faible', en: 'Low' },
  'methodology.riskMedium': { fr: 'Moyenne', en: 'Medium' },
  'methodology.riskHigh': { fr: 'Élevée', en: 'High' },

  'methodology.realityTitle': { fr: 'Où en est le robot : quatre stades', en: 'Status: four stages' },
  'methodology.realityLead': {
    fr: 'Chaque fiche porte un stade qui dit où en est le robot : déployé, pilote, démo ou annonce papier. Il est calculé d’après les affirmations validées et le statut commercial, jamais saisi à la main, et une fiche sans preuve n’a pas de stade. Ce que le fabricant écrit lui-même ne fait jamais monter le stade au-delà de l’annonce papier.',
    en: 'Every profile carries a stage saying where the robot stands: deployed, pilot, demo or announced only. It is computed from the validated claims and the commercial status, never typed by hand, and a profile with no proof has no stage. What the maker writes about itself never raises the stage beyond announced only.',
  },
  'methodology.realityCaption': {
    fr: 'Les règles se lisent de haut en bas : la première qui s’applique l’emporte',
    en: 'Rules read top to bottom: the first that applies wins',
  },
  'methodology.badgesTitle': { fr: 'Badges', en: 'Badges' },
  'methodology.badgesCaption': {
    fr: 'Chaque badge est dérivé d’une règle, jamais saisi à la main',
    en: 'Each badge is derived from a rule, never entered by hand',
  },
  'methodology.colBadge': { fr: 'Badge', en: 'Badge' },
  'methodology.colRule': { fr: 'Règle', en: 'Rule' },
  // One rule per badge key (`methodology.badgeRule.<badge key>`).
  'methodology.badgeRule.manufacturer_claim': {
    fr: 'Le niveau de preuve le plus élevé parmi les affirmations validées est « annonce fabricant ».',
    en: 'The highest level of evidence among the validated claims is “manufacturer claim”.',
  },
  'methodology.badgeRule.manufacturer_demo': {
    fr: 'Le niveau de preuve le plus élevé parmi les affirmations validées est « démonstration fabricant ».',
    en: 'The highest level of evidence among the validated claims is “manufacturer demonstration”.',
  },
  'methodology.badgeRule.independently_tested': {
    fr: 'Au moins un Affirmation validée provient d’un test indépendant.',
    en: 'At least one validated claim comes from an independent test.',
  },
  'methodology.badgeRule.vuntum_tested': {
    fr: 'Au moins un Affirmation validée provient d’une mesure réalisée par Vuntum.',
    en: 'At least one validated claim comes from a measurement made by Vuntum.',
  },
  'methodology.badgeRule.unverified': {
    fr: 'Aucun Affirmation validée au-dessus du niveau « non vérifié ».',
    en: 'No validated claim above the “unverified” level.',
  },
  'methodology.badgeRule.teleoperation': {
    fr: 'Affirmation validée `teleoperation.supported` = oui.',
    en: 'Validated claim `teleoperation.supported` = yes.',
  },
  'methodology.badgeRule.sdk_public': {
    fr: 'Affirmation validée `software.sdk_public` = oui.',
    en: 'Validated claim `software.sdk_public` = yes.',
  },
  'methodology.badgeRule.api_cloud': {
    fr: 'Affirmation validée `software.api_cloud` = oui.',
    en: 'Validated claim `software.api_cloud` = yes.',
  },
  'methodology.badgeRule.local_control': {
    fr: 'Affirmation validée `software.local_control` = oui.',
    en: 'Validated claim `software.local_control` = yes.',
  },
  'methodology.badgeRule.preorder': {
    fr: 'Statut commercial `preorder`, ou Affirmation validée `availability.state` = preorder.',
    en: 'Commercial status `preorder`, or validated claim `availability.state` = preorder.',
  },
  'methodology.badgeRule.available_eu': {
    fr: 'Affirmation validée `availability.state` = available, issu d’une source officielle, sur un marché UE/EEE.',
    en: 'Validated claim `availability.state` = available, from an official source, for an EU/EEA market.',
  },
  'methodology.badgeRule.sample_data': {
    fr: 'L’entité ou la valeur est un exemple de démonstration, pas une donnée réelle.',
    en: 'The entity or the value is marked `is_sample`.',
  },
  'methodology.badgeRule.stale_data': {
    fr: 'Au moins une affirmation affichée dépasse le délai de fraîcheur de son prédicat.',
    en: 'At least one displayed claim is past the freshness limit of its predicate.',
  },
  'methodology.badgeRule.disputed': {
    fr: 'Au moins une affirmation affichée est contestée (deux sources crédibles se contredisent).',
    en: 'At least one displayed claim is in the `disputed` state.',
  },

  'methodology.priceTitle': { fr: 'Prix européen estimé', en: 'Estimated European price' },
  // The lead of a paragraph that goes on with the emphasised « Estimation
  // Vuntum » (key `compare.estimate`) and `methodology.priceLabelTail`.
  'methodology.priceLead': {
    fr: 'Ce n’est pas un fait, c’est un calcul. Il est toujours affiché à côté du prix officiel d’origine et étiqueté',
    en: 'This is not a fact, it is a calculation. It is always shown next to the original official price and labelled',
  },
  'methodology.priceLabelTail': { fr: ' :', en: ':' },
  'methodology.priceFormula': {
    fr: 'prix officiel × taux de change daté × (1 + droits de douane) × (1 + TVA) + frais forfaitaires',
    en: 'official price x dated exchange rate x (1 + customs duty) x (1 + VAT) + flat fees',
  },
  'methodology.priceNote': {
    fr: 'Le taux de change utilisé est daté et sourcé. Les droits de douane, la TVA et les frais réels varient selon le pays et le canal de vente : l’estimation n’engage aucun vendeur.',
    en: 'The exchange rate used is dated and sourced. Customs duty, VAT and actual fees vary by country and sales channel: the estimate does not commit any seller.',
  },

  'methodology.releasePriceTitle': {
    fr: 'Fourchette de prix des sorties à venir',
    en: 'Price range of upcoming releases',
  },
  'methodology.releasePrice1': {
    fr: 'Sur la liste des sorties à venir, le prix affiché est d’abord celui que le fabricant a annoncé, avec sa source et sa date. Quand aucun prix n’est annoncé, la page écrit « Prix non communiqué ».',
    en: 'On the list of upcoming releases, the price shown is first the one the manufacturer announced, with its source and date. When no price is announced, the page says “Price not disclosed”.',
  },
  'methodology.releasePrice2': {
    fr: 'Dans ce seul cas, une fourchette peut s’ajouter, étiquetée « Estimation Vuntum » : ce n’est jamais un prix. Elle va du plus bas au plus haut des prix constatés de robots déjà en vente, d’abord ceux du même fabricant, à défaut ceux de même forme et de même usage. Chaque robot compté est listé sous la fourchette, avec un lien vers sa fiche et sa source.',
    en: 'In that case only, a range may be added, labelled “Vuntum estimate”: it is never a price. It runs from the lowest to the highest observed price of robots already available to buy, first those of the same manufacturer, otherwise those of the same form and use. Every robot counted is listed under the range, with a link to its profile and source.',
  },
  'methodology.releasePrice3': {
    fr: 'Conditions : au moins trois robots comparés, chacun avec un prix constaté dans la même monnaie et vérifié depuis moins de 30 jours ; un écart entre le plus cher et le moins cher qui ne dépasse pas quatre fois (au-delà, la fourchette n’apprendrait rien) ; aucune fourchette si le fabricant a annoncé un prix. Sans ces conditions, la page n’affiche pas d’estimation.',
    en: 'Conditions: at least three robots compared, each with an observed price in the same currency checked within the last 30 days; the dearest no more than four times the cheapest (beyond that, a range would tell nothing); no range at all when the manufacturer announced a price. Without these conditions, the page shows no estimate.',
  },

  'methodology.publicationTitle': { fr: 'Publication', en: 'Publication' },
  'methodology.publication1': {
    fr: 'Vuntum publie automatiquement, sous garde-fous, ce qui passe tous ses contrôles. Une valeur n’est publiée qu’après une seconde lecture indépendante par un autre modèle d’IA, qui confronte la valeur à la citation de la source ; une valeur que seul un média rapporte, sans l’avoir mesurée, n’est publiée que si une seconde source indépendante donne la même valeur (la page du fabricant ou un autre média), et elle est refusée si cette seconde source n’arrive pas en 30 jours. Un article n’est publié que si chacune de ses phrases factuelles renvoie à une valeur déjà publiée et si ses chiffres en proviennent. Une brève n’est publiée que si chacune de ses phrases s’appuie sur une citation retrouvée mot pour mot dans la source, que ses chiffres figurent dans ces citations et qu’une relecture par un autre modèle ne trouve rien à redire.',
    en: 'Vuntum publishes automatically, within safeguards, whatever passes all of its checks. A value is published only after a second, independent reading by another AI model, which checks the value against the quote from the source. A value that only a media outlet reports, without having measured it, is published only if a second independent source gives the same value (the manufacturer’s page or another outlet), and it is refused if that second source does not turn up within 30 days. An article is published only if each of its factual sentences points to a value that is already published and its figures come from those values. A brief is published only if each of its sentences rests on a quote found word for word in the source, its figures appear in those quotes, and a review by another model finds nothing to object to.',
  },
  'methodology.publication2': {
    fr: 'Des valeurs déjà publiées sont relues au hasard chaque jour : une valeur contredite est retirée et la correction est affichée. Un disjoncteur suspend toute publication automatique en cas de comportement anormal (trop de refus, trop de publications depuis une même source). L’éditeur contrôle a posteriori et peut tout annuler. Les signalements de lecteurs sont traités en priorité.',
    en: 'Values that are already published are re-read at random every day: a value that is contradicted is withdrawn and the correction is displayed. A circuit breaker suspends all automatic publication in the event of abnormal behaviour (too many refusals, too many publications from a single source). The editor checks after the fact and can reverse anything. Reports from readers are handled first.',
  },
  'methodology.publication3': {
    fr: 'Ne sont jamais publiés : recommandations d’achat, accusations, informations de sécurité ou de vie privée non établies, rumeurs, et tout ce qu’une source ne permet pas de vérifier.',
    en: 'Never published: buying recommendations, accusations, unestablished security or privacy information, rumours, and anything a source does not allow us to verify.',
  },

  'methodology.accountabilityTitle': {
    fr: 'Qui répond de ce qui est publié',
    en: 'Who answers for what is published',
  },
  'methodology.accountability1': {
    fr: 'Vuntum est édité par Antoine, directeur de la publication. Les informations d’identification que la loi impose figurent dans les [mentions légales](~/mentions-legales).',
    en: 'Vuntum is published by Antoine, publication director. The identification details the law requires are in the [legal notice](~/mentions-legales).',
  },
  'methodology.accountability2': {
    fr: '**Avant publication**, un texte ou une valeur doit passer : la citation exacte retrouvée mot pour mot dans la source, les chiffres retrouvés dans cette citation, la seconde lecture par un autre modèle d’IA et, pour une photo, un contrôle visuel avec la mention de son auteur et de sa licence. Ce qui échoue à l’un de ces contrôles n’est pas publié.',
    en: '**Before publication**, a text or a value must pass: the exact quote found word for word in the source, the figures found in that quote, a second reading by another AI model and, for a photo, a visual check with the author and the licence stated. Whatever fails one of these checks is not published.',
  },
  'methodology.accountability3': {
    fr: '**Après publication**, des valeurs déjà en ligne sont relues au hasard chaque jour, un audit automatique recoupe chaque jour les données publiées avec les pages qu’elles citent, et l’éditeur reçoit chaque matin une synthèse de ce qui a été mis en ligne, refusé et signalé la veille. Il peut retirer ou corriger n’importe quel contenu.',
    en: '**After publication**, values already online are re-read at random every day, an automatic audit cross-checks the published data against the pages they cite every day, and the editor receives each morning a summary of what was put online, refused and reported the day before. The editor can withdraw or correct any content.',
  },
  'methodology.accountability4': {
    fr: '**Corrections.** Chaque correction est datée dans le [journal des corrections](~/corrections), et une correction importante est aussi signalée sur la page concernée. Pour signaler une erreur : [formulaire de signalement](~/signaler).',
    en: '**Corrections.** Every correction is dated in the [corrections log](~/corrections), and an important correction is also flagged on the page concerned. To report an error: [report form](~/signaler).',
  },

  'methodology.aiTitle': { fr: 'Rôle de l’IA', en: 'The role of AI' },
  'methodology.aiText': {
    fr: 'Des outils d’IA trient les sources, extraient les valeurs, traduisent, rédigent les articles et les brèves, et relisent le travail d’un autre modèle. Leur sortie est vérifiée mécaniquement : la citation doit être une sous-chaîne exacte de la source, les nombres doivent se retrouver dans la citation, et un identifiant absent des données d’entrée invalide la sortie. Chaque texte rédigé avec l’IA porte une mention près de sa date.',
    en: 'AI tools sort the sources, extract the values, translate, write the articles and briefs, and review the work of another model. Their output is checked mechanically: the quote must be an exact substring of the source, numbers must be found in the quote, and an identifier absent from the input data invalidates the output. Every text written with AI carries a note next to its date.',
  },

  'methodology.collectionTitle': { fr: 'Collecte', en: 'Collection' },
  'methodology.collectionText': {
    fr: 'Nous respectons robots.txt, les conditions des plateformes et des limites de débit. Nous n’utilisons aucun contournement de protection anti-bot. Pour collecter les sources des brèves, des articles et des fiches, nous ne téléchargeons ni ne réhébergeons aucune vidéo. Nos propres vidéos courtes peuvent reprendre de brefs extraits crédités de vidéos de tiers. Les archives de pages consultées sont conservées en interne comme preuve et ne sont jamais republiées : seules de courtes citations sont affichées, avec attribution.',
    en: 'We respect robots.txt, platform terms and rate limits. We use no workaround for anti-bot protection. When collecting sources for briefs, articles and robot profiles, we neither download nor rehost any video. Our own short videos may reuse brief, credited excerpts of third-party videos. Source snapshots of the pages we consulted are kept internally as evidence and are never republished: only short quotes are displayed, with attribution.',
  },

  'methodology.independenceTitle': { fr: 'Indépendance', en: 'Independence' },
  'methodology.independenceText': {
    fr: 'Aucun placement payé dans les comparatifs. Tout lien d’affiliation éventuel est signalé à l’endroit où il apparaît. Les conflits d’intérêts sont déclarés. Une erreur signalée est corrigée et consignée dans le journal des corrections.',
    en: 'No paid placement in comparisons. Any affiliate link is flagged where it appears. Conflicts of interest are declared. An error that is reported is corrected and recorded in the corrections log.',
  },
  'methodology.scopeTitle': { fr: 'Ce que nous suivons', en: 'What we follow' },
  'methodology.scopeUpdated': {
    fr: 'Périmètre éditorial mis à jour le {date}. Le même texte est donné aux IA par le serveur MCP (outil `get_editorial_scope`).',
    en: 'Editorial scope updated on {date}. The same text is given to AI systems by the MCP server (`get_editorial_scope` tool).',
  },
} as const satisfies Record<string, Message>;
