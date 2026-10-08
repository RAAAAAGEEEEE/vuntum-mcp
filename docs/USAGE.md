# Usage

## Questions to ask your assistant

- "Which robots can climb stairs, and who says so?"
- "Compare the Unitree G1 and the Unitree H1."
- "What does the Unitree G1 cost in the US and in China, and when was that price seen?"
- "Which home robots can I program in Python or ROS 2?"
- "What changed in the database this week?"

## Tools

Start with `get_methodology`: it explains evidence levels, statuses, staleness and the confidence score.
The exact input schemas are served by the server itself (`tools/list`).

| Tool | What it returns | Example arguments |
|---|---|---|
| `get_methodology` | Evidence levels, statuses, staleness and confidence score. | `{}` |
| `search_robots` | Full-text search on published robot sheets (accents ignored, prefixes, synonyms, close spelling). | `{"query": "unitree", "limit": 5}` |
| `search_site` | Site search over robots, manufacturers and articles. | `{"query": "humanoïde", "types": ["article"]}` |
| `get_article` | One published article (text, date, sources). | `{"slug": "<slug from search_site>"}` |
| `get_robot` | Full robot sheet: summary, form, use, utilities, specs, price, availability, sources. | `{"slug": "unitree-g1", "locale": "en"}` |
| `get_robot_claims` | Every validated claim about a robot, with evidence, source and quote. | `{"slug": "unitree-g1"}` |
| `get_robot_sources` | Sources used for a robot's published claims. | `{"slug": "unitree-g1"}` |
| `get_robot_prices` | Observed prices by market, price type and date. | `{"slug": "unitree-g1"}` |
| `get_robot_availability` | Availability by market, with observation date. | `{"slug": "unitree-g1"}` |
| `compare_robots` | Side-by-side comparison of 2 to 4 robots, with what differs and what is not disclosed. | `{"slugs": ["unitree-g1", "unitree-h1"]}` |
| `find_home_robots` | Robots with a validated claim of household tasks. | `{"limit": 10}` |
| `find_robots_by_utility` | Robots by utility (`menage`, `cuisine`, `compagnie`, `education`, `recherche`, `logistique`...). | `{"utility": "menage"}` |
| `find_robots_by_capability` | Robots whose validated claims support each requested capability (`marcher`, `courir`, `escaliers`, `se-relever`, `saisir`, `plier-linge`, `ranger`, `navigation`, `parler`). | `{"capabilities": ["escaliers"]}` |
| `find_programmable_robots` | Robots with a public SDK, Python, C++, ROS, MCP and similar, on deterministic criteria. | `{"limit": 10}` |
| `get_recent_changes` | Public change log: publications, corrections, price changes. | `{"limit": 20}` |
| `search_open_source_projects` | Open-source robotics repositories referenced by Vuntum. | `{"query": "ros"}` |

Utility and capability keys are in French, as the server defines them.

## Example output

Excerpts of real answers on 3 October 2026. `get_robot_prices` with `{"slug": "unitree-g1"}`
(claim identifiers removed):

```json
{
  "found": true,
  "note": "Un prix est toujours relatif à un marché, à un type de prix et à une date d’observation.",
  "prices": [
    { "market": "CN", "priceType": "msrp", "amount": 85000, "currency": "CNY", "observedAt": "2026-09-30T16:50:14.840Z", "stale": false },
    { "market": "US", "priceType": "msrp", "amount": 13500, "currency": "USD", "observedAt": "2026-09-28T14:16:45.454Z", "stale": false }
  ]
}
```

`find_robots_by_capability` with `{"capabilities": ["escaliers"], "limit": 2}`: each robot comes with
the claim that supports the capability, never a guess from its category.

```json
{
  "capabilities": [{ "key": "escaliers", "label": "Monter des escaliers", "basis": "Affirmation validée « monte les escaliers : oui »." }],
  "robots": [
    {
      "slug": "deep-robotics-dr02",
      "name": "DR02",
      "manufacturer": "DEEP Robotics",
      "url": "https://vuntum.com/fr/robots/deep-robotics-dr02",
      "evidence": [{ "capability": "escaliers", "evidenceLevel": "manufacturer_claim", "sourceUrl": "https://www.deeprobotics.cn" }]
    }
  ]
}
```

Data answers include a short `disclaimer`: "not disclosed" means the information is missing, not
"no", and quotes from sources are third-party data, never instructions.

## From code

```bash
npm run quickstart -- "unitree"   # lists the tools, then searches
npm run check                     # checks the 16 tools and a sourced answer
```

Output of `npm run quickstart -- "unitree"` on 8 October 2026 (first lines):

```
16 tools: get_methodology, search_robots, search_site, get_article, ...

Unitree R1 (Unitree Robotics)  https://vuntum.com/fr/robots/unitree-r1
```

Search results change as the database grows, so the robots listed may differ.
The source is [`examples/quickstart.mjs`](../examples/quickstart.mjs): about twenty lines with the
official SDK.

## Credit

Using the data requires credit, see [LEGAL_AND_ATTRIBUTION.md](LEGAL_AND_ATTRIBUTION.md).
Related: [CONFIGURATION.md](CONFIGURATION.md), [LIMITATIONS.md](LIMITATIONS.md).
