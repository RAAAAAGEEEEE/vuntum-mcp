# Limitations

- **Rate limit:** 60 HTTP requests per minute per IP address (a client session also counts
  `initialize` and `tools/list`); beyond that, HTTP 429 with `Retry-After: 60`.
- **Stateless:** no session, no memory between requests.
- **Up to 50 results per call.**
- **Languages:** robot sheets, search results, comparisons and articles are in French by default,
  in English with `locale: "en"` (on `search_robots`, `search_site`, `get_article`, `get_robot`,
  `compare_robots`). Figures and sources are the same in both languages. Utility and capability
  keys (`menage`, `escaliers`...) are in French.
- **Published data only.** A missing value means Vuntum has not found a reliable source yet. "Not
  disclosed" is not "no".
- **Evidence varies.** A claim can come from the manufacturer only; each claim carries its evidence
  level. Read `get_methodology` first.
- **Prices are dated.** A price is relative to a market, a price type and an observation date.
- **Read-only:** nothing can be written, corrected or reported through the server.
- **Not for bulk use.** Use the REST API and the full export (OpenAPI 3.1, CSV, JSON Lines) described
  on [vuntum.com/fr/donnees](https://vuntum.com/fr/donnees).
- **This repository** holds examples only. The server code is not here, and the examples need
  Node.js 20 or later.

The limits above come from the server's public description; the examples do not enforce them.
Related: [TROUBLESHOOTING.md](TROUBLESHOOTING.md), [USAGE.md](USAGE.md).
