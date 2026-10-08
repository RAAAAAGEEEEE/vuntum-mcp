# Installation

The server is remote: there is nothing to install to use it. Add the address
`https://vuntum.com/mcp` to your client. No key, no sign-in.

## claude.ai and Claude Desktop

**Customize > Connectors**, then **Add custom connector**. URL: `https://vuntum.com/mcp`.
Authentication: **No sign-in**. Then **Add**. In a conversation, turn it on from the **+** menu,
**Connectors**. On Team and Enterprise plans, an owner adds it first in
**Organization settings > Connectors**.

## Claude Code

```bash
claude mcp add --transport http vuntum https://vuntum.com/mcp
```

Or in `.mcp.json`:

```json
{
  "mcpServers": {
    "vuntum": { "type": "http", "url": "https://vuntum.com/mcp" }
  }
}
```

Tested on 3 October 2026: Claude Code lists the 16 tools and calls them.

## ChatGPT

Remote MCP servers need developer mode (**Settings > Security and login > Developer mode**, on
plans that offer it). Then create an app with the URL `https://vuntum.com/mcp` and
**No authentication**. Menu names change often: follow ChatGPT's current help for developer mode.

## Cursor

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "vuntum": { "url": "https://vuntum.com/mcp" }
  }
}
```

## VS Code

`.vscode/mcp.json`:

```json
{
  "servers": {
    "vuntum": { "type": "http", "url": "https://vuntum.com/mcp" }
  }
}
```

## The Node.js examples

Prerequisite: Node.js 20 or later.

```bash
git clone https://github.com/RAAAAAGEEEEE/vuntum-mcp
cd vuntum-mcp
npm install
npm run check
```

Expected last line: `OK: 16 tools, all read-only, get_robot answers with sourced data.`
Run on 8 October 2026 with Node.js v22.20.0.

Next: [USAGE.md](USAGE.md). If something fails: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
