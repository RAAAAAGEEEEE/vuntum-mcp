# Configuration

The remote server needs no configuration: no key, no account.

## Environment variable (examples only)

| Variable | Default | Used by | Role |
|---|---|---|---|
| `VUNTUM_MCP_URL` | `https://vuntum.com/mcp` | `examples/quickstart.mjs`, `examples/check.mjs` | Address of the MCP server the examples connect to. |

Example, to point the smoke test at another address:

```bash
VUNTUM_MCP_URL=https://example.org/mcp npm run check
```

(`https://example.org/mcp` is an illustrative address, not a real server.)

There is no `.env.example`: the variable is optional and the examples do not read `.env` files.

## Tool arguments

- `limit`: up to 50 results per call.
- `locale`: `"en"` for English; French by default. Accepted on `search_robots`, `search_site`,
  `get_article`, `get_robot` and `compare_robots`.

Details: [USAGE.md](USAGE.md), [LIMITATIONS.md](LIMITATIONS.md).
