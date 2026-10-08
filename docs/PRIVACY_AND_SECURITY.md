# Privacy and security

## Design

- **Read-only.** The 16 tools are annotated `readOnlyHint: true`; [`npm run check`](../examples/check.mjs)
  fails if one is not.
- **No authentication, no secret.** The server needs no key or account, and nothing in this
  repository requires one. `.gitignore` excludes `.env`, `*.pem` and `.mcpregistry_*`.
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
