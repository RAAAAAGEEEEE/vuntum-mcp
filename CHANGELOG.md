# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This repository holds the
source code of the Vuntum MCP server (MIT), its public description and client examples. The Vuntum
data (CC BY-NC 4.0) is not in this repository.

## [Unreleased]

## [0.4.0] - 2026-11-27

### Added

- The twelve tools the public server (`https://vuntum.com/mcp`) already offered and this source lacked:
  `get_events`, `get_corrections`, `get_competition_results`, `get_upcoming_releases`,
  `get_company_figures`, `get_integrators`, `get_component_suppliers`, `get_guides`, `get_authors`,
  `get_glossary`, `get_rankings` and `get_observatory`. The code now registers the same 32 read-only
  tools, with the same descriptions and input schemas, as the server on vuntum.com. None of them needs a
  pro key.
- `server/sql/schema.sql`: tables `public_robot_category`, `public_event`, `public_correction`,
  `public_competition_result`, `public_company_figure`, `public_integrator_partnership`,
  `public_author` and `public_glossary_entry`; column `public_robot.home_task`; columns `robot_name`,
  `manufacturer_name`, `country_code`, `ownership` and `confirmed_at` on `public_component_link`. A
  database created with 0.3.0 needs these additions (see the file), the new tools read them.
- Fictitious rows for each new table in `server/sql/seed.sql`, and tests that call the twelve tools on the
  seed.
- Dependabot opens weekly pull requests for npm dependencies (minor and patch grouped) and monthly
  ones for GitHub Actions.
- Issue template for server bugs; data errors go to contact@vuntum.com.

### Changed

- The server instructions point to the monthly open snapshot of the Vuntum data, as on vuntum.com.
- The descriptions of `get_change_history` and `get_fact_sources` give the pro access address
  `https://vuntum.com/en/business#demande`.
- `examples/check.mjs` and the documentation expect the 32 tools.

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
