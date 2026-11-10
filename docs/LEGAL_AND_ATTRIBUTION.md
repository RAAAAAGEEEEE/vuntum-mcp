# Legal and attribution

## Code

The code in this repository (server in [`server/`](../server/), SQL schema, demo seed, examples,
`server.json`, `glama.json`) is under the [MIT license](../LICENSE), copyright 2026 Antoine / Vuntum.

## Data

The Vuntum data (robot sheets, prices, sources) is **not** in this repository. The file
[`server/sql/seed.sql`](../server/sql/seed.sql) only holds fictitious robots ("Demo Robot A", B, C)
with sources on example.com; it is under the MIT license like the rest of the code.

The data served by `https://vuntum.com/mcp` is under
[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) for the versions published since
24 October 2026 (earlier versions: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
Every answer carries the expected credit in its `attribution` field, for example:

> Source: Vuntum, <link to the page concerned on vuntum.com>, CC BY-NC 4.0

Reproduce it with the data, with its link. Commercial use needs the pro access:
[vuntum.com/fr/api-mcp#acces-pro](https://vuntum.com/fr/api-mcp#acces-pro).

## Dependencies

The examples at the root use `@modelcontextprotocol/sdk` (pinned in [`package.json`](../package.json)).
The server uses `@modelcontextprotocol/sdk`, `zod` and `postgres` (pinned in
[`server/package.json`](../server/package.json)). Their licenses are in their own packages; the
Model Context Protocol is described on [modelcontextprotocol.io](https://modelcontextprotocol.io).

## Third-party content

Quotes and source links returned by the tools belong to their authors. Vuntum returns them as
sourced evidence.

Legal notice of the publisher: [vuntum.com/fr/mentions-legales](https://vuntum.com/fr/mentions-legales).

## Texts shipped with the code

The methodology and editorial-scope texts in `server/src/domain/` (`methodology-messages.ts`, `editorial-scope-data.ts`)
are part of this repository and are released under the MIT licence with the code. The editorial content of vuntum.com
(articles, news, robot overviews) is not in this repository and remains all rights reserved.
