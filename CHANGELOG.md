# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This repository holds the
source code of the Vuntum MCP server (MIT), its public description and client examples. The Vuntum
data (CC BY-NC 4.0) is not in this repository.

## [Unreleased]

### Added

- Dependabot opens weekly pull requests for npm dependencies (minor and patch grouped) and monthly
  ones for GitHub Actions.
- Issue template for server bugs; data errors go to contact@vuntum.com.

## [0.3.0] - 2026-11-24

### Added

- `DATABASE_URL=demo` starts the stdio server on an in-memory database with the three fictitious
  robots of `sql/seed.sql`, and a root `Dockerfile` runs it that way (no network, no secret), so that
  MCP directories such as Glama can build and inspect the server.
- Every tool parameter now has a description; the shortest tool descriptions say what they return
  and which sibling tool to use instead.

### Security

- A directory name in `User-Agent` no longer opens 2,000 tool calls a day: directories get 300,
  on the same counter as the address; assistant names without a published address list
  (OpenAI-MCP, Gemini-User) get the public quota.
- Full quota tables (daily and per minute) forget their smallest counters instead of refusing
  every newcomer until midnight UTC; IPv6 is counted per /48 once more than 32 /64 of it show up
  in a day (never for a verified assistant connector).

## [0.2.0] - 2026-11-10

### Added

- Source code of the server in [`server/`](server/), under the MIT license: 20 read-only tools,
  stdio and Streamable HTTP transports, quota on `tools/call` only, pro access by SHA-256 hashed
  key, attribution and license in every answer, HTTP guard, graceful shutdown.
- Data access behind the `VuntumReader` interface, with a PostgreSQL adapter (`DATABASE_URL`,
  read-only role).
- `server/sql/schema.sql`, `server/sql/readonly-role.sql` and `server/sql/seed.sql` (three
  fictitious robots, sources on example.com; no Vuntum data).
- Tests on an in-memory PostgreSQL (PGlite): `npm ci && npm test && npm run build` in `server/`.
- Docker Compose demo (PostgreSQL + seed + server, bound to 127.0.0.1) and configurations for
  Claude Desktop, Claude Code and Cursor in [`examples/local/`](examples/local/).

### Changed

- `README.md` rewritten with a full French section and a full English section.
- Documentation updated from 16 to 20 tools, the number the public server lists.
- `LICENSE`: copyright holder "Antoine / Vuntum".
- Examples: `@modelcontextprotocol/sdk` 1.30.0 to 1.32.2 and lock file refreshed (`npm audit`: 0
  vulnerabilities); `examples/check.mjs` expects the 20 tools.
- Data license stated as CC BY-NC 4.0 (versions from 24 October 2026; earlier versions CC BY 4.0),
  daily quota and mandatory attribution documented.

### Earlier, not released separately

- `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md` and the detailed documents in [`docs/`](docs/).
- `README.md` shortened: client setup, tool reference and limits moved to `docs/`.

## [0.1.0] - 2026-10-03

### Added

- Public description of the server: `server.json` (registry name `com.vuntum/mcp`) and `glama.json`.
- Client examples: `examples/quickstart.mjs` and `examples/check.mjs`.
- `README.md` with the 16 read-only tools and setup for Claude, Cursor, VS Code and ChatGPT.
- MIT license for the code in this repository.
