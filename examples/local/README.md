# Client configurations for a local server

These files point an MCP client at a server you run yourself with the demo
database of [`server/docker-compose.yml`](../../server/docker-compose.yml)
(fictitious robots only). The password in them is the local demo placeholder
of that file: change both together if you change it.

| File | Client | Where it goes |
|---|---|---|
| `claude_desktop_config.json` | Claude Desktop (stdio) | Settings > Developer > Edit Config |
| `claude-code.mcp.json` | Claude Code (HTTP and stdio) | `.mcp.json` at the root of a project |
| `cursor-mcp.json` | Cursor (HTTP and stdio) | `~/.cursor/mcp.json` or `.cursor/mcp.json` |

Replace `/ABSOLUTE/PATH/TO/vuntum-mcp` with the folder where you cloned the
repository, after `npm ci && npm run build` in `server/`.

To use the real Vuntum data instead, nothing to install: add
`https://vuntum.com/mcp` (see [docs/INSTALLATION.md](../../docs/INSTALLATION.md)).
