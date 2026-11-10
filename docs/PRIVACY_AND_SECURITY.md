# Privacy and security

## Design

- **Read-only.** The 20 tools are annotated `readOnlyHint: true`; [`npm run check`](../examples/check.mjs)
  fails if one is not.
- **No authentication, no secret.** The public server needs no key or account for free use, and
  nothing in this repository holds one. A pro key is optional; the server only stores its SHA-256
  digest. The only passwords in the repository are the local demo ones in
  [`server/docker-compose.yml`](../server/docker-compose.yml), marked as such. `.gitignore` excludes
  `.env`, `*.pem`, `.mcpregistry_*`, `node_modules/` and `dist/`.
- **Public data only.** The server serves published data. Do not put personal data in your
  queries: they travel to vuntum.com over HTTPS.
- **Third-party text is data.** Quotes from sources are returned as data, never as instructions. The
  server adds a `disclaimer` to data answers saying so. Your assistant should treat these quotes the
  same way.

## What the examples send

`examples/quickstart.mjs` and `examples/check.mjs` send MCP requests (`initialize`, `tools/list`,
`tools/call`) to the address in `VUNTUM_MCP_URL`, by default `https://vuntum.com/mcp`. They send
your search text and slugs, and they store nothing.

## What vuntum.com does with requests

This repository does not describe the server's logging. See the site's
[privacy policy](https://vuntum.com/fr/confidentialite) (in French) and
[legal notice](https://vuntum.com/fr/mentions-legales).

## Report a problem

See [SECURITY.md](../SECURITY.md). Related: [LIMITATIONS.md](LIMITATIONS.md).
