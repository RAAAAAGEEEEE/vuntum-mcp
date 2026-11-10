# Architecture

```
MCP client (Claude, ChatGPT, Cursor, VS Code, your code)
        |  Streamable HTTP (or stdio for a local server), no sign-in
        v
server-http.ts / server-stdio.ts   HTTP guard, quota, pro key, graceful shutdown
        |
server.ts + tools.ts               20 read-only tools, attribution + license in every answer
        |
VuntumReader (data/reader.ts)      the only way the tools reach data
        |
createSqlReader (data/sql-reader.ts) -> PostgreSQL, read-only role, public_* relations
```

The public server runs at `https://vuntum.com/mcp`. The same code is in [`server/`](../server/)
and can run on your machine against the fictitious seed.

- **Read-only.** All 20 tools carry the annotation `readOnlyHint: true` (checked by
  [`examples/check.mjs`](../examples/check.mjs) against the public server). The PostgreSQL role
  has `default_transaction_read_only` and only reads `public_*` relations
  ([`server/sql/readonly-role.sql`](../server/sql/readonly-role.sql)).
- **Stateless.** Over HTTP, each POST gets a fresh MCP server and transport; no session, no memory
  between requests. `GET` and `DELETE` on `/mcp` answer 405.
- **Data access behind an interface.** The tools only see `VuntumReader`. The PostgreSQL adapter
  holds every SQL statement, all parameterised. Another adapter (an API, files) can replace it
  without touching the tools.
- **Quota and pro access** ([`server/src/access.ts`](../server/src/access.ts)). Only `tools/call`
  counts: 100 a day per address (IPv6 per /64), 2,000 shared for known directories and AI assistant
  connectors whose address is in their operator's published ranges. A pro key
  (`Authorization: Bearer vtm_...` or `X-Vuntum-Key`) is looked up by its SHA-256 digest through
  `public_api_key_lookup`, a `SECURITY DEFINER` function: the read-only role cannot read the
  `api_key` table. Unknown or revoked key: 403.
- **Terms in every answer** ([`server/src/terms.ts`](../server/src/terms.ts)): `attribution` and
  `license` come first in each tool result.
- **HTTP guard** ([`server/src/http-guard.ts`](../server/src/http-guard.ts)): POST only, 64 KiB
  body, one JSON-RPC message per request, per-minute limit per address, forwarded headers believed
  only from a proxy on loopback or a private network.
- **Graceful shutdown** ([`server/src/graceful-shutdown.ts`](../server/src/graceful-shutdown.ts)):
  on SIGTERM, 5 s of `Connection: close`, then stop listening, then up to 12 s for requests in
  progress, then the database pool closes.

## What is in this repository

| Path | Role |
|---|---|
| [`server/src/`](../server/src/) | Server code (TypeScript, Node.js 20 or later), MIT. |
| [`server/src/domain/`](../server/src/domain/) | Schemas (zod) of the answers and of the editorial rules. |
| [`server/src/data/`](../server/src/data/) | `VuntumReader` and its PostgreSQL adapter. |
| [`server/sql/schema.sql`](../server/sql/schema.sql) | The `public_*` tables the adapter reads, `search_site`, `api_key` and its lookup function. |
| [`server/sql/seed.sql`](../server/sql/seed.sql) | Three fictitious robots (Demo Robot A, B, C). No Vuntum data. |
| [`server/sql/readonly-role.sql`](../server/sql/readonly-role.sql) | The read-only role of the server. |
| [`server/docker-compose.yml`](../server/docker-compose.yml) | Local demo: PostgreSQL + seed + server on 127.0.0.1. |
| [`examples/local/`](../examples/local/) | Claude Desktop, Claude Code and Cursor configurations for the local server. |
| [`server.json`](../server.json) | Entry for the official MCP registry (`com.vuntum/mcp`). |
| [`glama.json`](../glama.json) | Maintainer declaration for the Glama directory. |
| [`examples/quickstart.mjs`](../examples/quickstart.mjs) | Lists the tools of the public server, then searches robots. |
| [`examples/check.mjs`](../examples/check.mjs) | Smoke test of the public server: 20 tools and one sourced answer. |

## Differences with vuntum.com

- On vuntum.com the `public_*` relations are views over the editorial database; here they are plain
  tables, filled by the seed.
- `search_site` here is portable SQL (all words, then some words). The production search also
  matches close spellings with `pg_trgm`.
- The Vuntum data itself (CC BY-NC 4.0) is not in this repository.

See also: [USAGE.md](USAGE.md), [LIMITATIONS.md](LIMITATIONS.md).
