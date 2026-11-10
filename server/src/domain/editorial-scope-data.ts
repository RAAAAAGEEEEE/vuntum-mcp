// Copy of the editorial scope published on the methodology pages of vuntum.com.
export const editorialScopeData = {
  "updatedOn": "2026-11-09",
  "tiers": {
    "priority": {
      "fr": {
        "title": "Suivi en priorité",
        "text": "Les robots humanoïdes et l'IA physique (modèles de robots, mains, actionneurs, capteurs, simulation) passent avant tout le reste : découverte, rédaction, vérification et publication. Les humanoïdes destinés au grand public viennent en tête, puis les autres humanoïdes, puis les robots à pattes, les manipulateurs mobiles et les robots utilitaires."
      },
      "en": {
        "title": "Followed first",
        "text": "Humanoid robots and physical AI (robot models, hands, actuators, sensors, simulation) come before everything else: discovery, writing, checking and publication. Humanoids for the general public come first, then the other humanoids, then legged robots, mobile manipulators and utility robots."
      }
    },
    "less": {
      "fr": {
        "title": "Suivi moins",
        "text": "Les aspirateurs et laveurs de sols qui ne sont pas humanoïdes, les tondeuses simples, les robots de piscine et de vitres et les autres petits robots de ménage passent en dernier (décision du 08/11/2026, renforcée le 09/11/2026). Aucune fiche n'est refusée pour autant : ils sont traités après tout le reste, avec les mêmes contrôles. Les robots industriels, les bras et les jouets simples passent aussi après les humanoïdes."
      },
      "en": {
        "title": "Followed less",
        "text": "Vacuum cleaners and floor cleaners that are not humanoids, simple lawn mowers, pool and window robots and other small household robots come last (decision of 08/11/2026, reinforced on 09/11/2026). No sheet is refused for that: they are handled after everything else, with the same checks. Industrial robots, arms and simple toys also come after the humanoids."
      }
    },
    "excluded": {
      "fr": {
        "title": "Plus suivi",
        "text": "La défense : aucun texte sur un robot militaire ou de défense n'est publié automatiquement, il reste relu et publié par une personne. Les robots de défense sont aussi écartés des rattrapages de fiches légères."
      },
      "en": {
        "title": "No longer followed",
        "text": "Defence: no text about a military or defence robot is published automatically; it is read and published by a person. Defence robots are also left out of the light-sheet catch-ups."
      }
    }
  },
  "rules": {
    "taskQueue": {
      "lowestPriority": 9,
      "titlePattern": "tondeuse|aspirateur|lave-sol|laveur de vitres|mower|vacuum|robot de m[eé]nage",
      "exemptPattern": "humano"
    },
    "robotOrder": {
      "lastSegments": [
        "industrial",
        "defense",
        "toy"
      ],
      "lastCategories": [
        "bras"
      ],
      "simpleHomeTasks": [
        "floor_cleaning",
        "lawn_mowing",
        "pool_cleaning",
        "window_cleaning"
      ],
      "simpleHomeCategories": [
        "domestique",
        "roues"
      ],
      "lastListPrefixes": [
        "industriel"
      ]
    },
    "excluded": {
      "defenceSegment": "defense",
      "adr": "ADR-078"
    }
  }
} as const;
