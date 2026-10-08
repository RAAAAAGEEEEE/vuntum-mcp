# Architecture

```
MCP client (Claude, ChatGPT, Cursor, VS Code, your code)
        |  Streamable HTTP, no sign-in
        v
https://vuntum.com/mcp   -- 16 read-only tools -->  published Vuntum data
```

- **Remote server.** Nothing is installed locally. The client opens a Streamable HTTP connection
  to `https://vuntum.com/mcp`, lists the tools (`tools/list`) and calls them.
- **Read-only.** All 16 tools carry the annotation `readOnlyHint: true`. This is checked by
  [`examples/check.mjs`](../examples/check.mjs).
- **Stateless.** No session and no memory between requests.
- **Published data only.** Every value comes from a dated, sourced claim with a level of evidence;
  `get_methodology` explains the levels.

## What is in this repository

| Path | Role |
|---|---|
| [`server.json`](../server.json) | Entry for the official MCP registry (`com.vuntum/mcp`). |
| [`glama.json`](../glama.json) | Maintainer declaration for the Glama directory. |
| [`examples/quickstart.mjs`](../examples/quickstart.mjs) | Lists the tools, then searches robots. |
| [`examples/check.mjs`](../examples/check.mjs) | Smoke test of the 16 tools and one sourced answer. |
| [`package.json`](../package.json) | Scripts `quickstart` and `check`; one dependency, `@modelcontextprotocol/sdk` 1.30.0. |

The server code is not in this repository.

See also: [USAGE.md](USAGE.md), [LIMITATIONS.md](LIMITATIONS.md).
