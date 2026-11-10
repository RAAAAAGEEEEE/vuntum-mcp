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

Tested on 3 October 2026: Claude Code lists the tools (16 at the time, 20 since) and calls them.

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

Expected last line: `OK: 20 tools, all read-only, get_robot answers with sourced data.`
Run on 8 October 2026 with Node.js v22.20.0.

Next: [USAGE.md](USAGE.md). If something fails: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Behind a reverse proxy

The server reads the client address from the socket. Behind a proxy on a private address it uses the last hop of
`X-Forwarded-For`. `X-Real-IP` is only trusted when you set `TRUST_X_REAL_IP=1`, and you should set it only if your
proxy overwrites that header (nginx: `proxy_set_header X-Real-IP $remote_addr;`). Caddy, Traefik and most hosted load
balancers pass the client's own value through: leave the variable unset with them, or anyone can pick their quota bucket.
