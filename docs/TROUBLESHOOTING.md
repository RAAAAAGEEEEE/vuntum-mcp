# Troubleshooting

## HTTP 429

You exceeded 60 HTTP requests per minute from your IP address. The response carries
`Retry-After: 60`. A client session also counts `initialize` and `tools/list`. Wait, then retry. For
bulk use, see [LIMITATIONS.md](LIMITATIONS.md).

## `npm run check` prints `{ missing, notReadOnly, hasDisclaimer }` and exits with 1

The server no longer matches the list in [`examples/check.mjs`](../examples/check.mjs):

- `missing` lists tools the documentation expects but the server does not expose;
- `notReadOnly` lists tools without `readOnlyHint: true`;
- `hasDisclaimer: false` means `get_robot` answered without a `disclaimer`.

Open an issue with the full output.

## `npm run check` fails to connect

1. Check the address: `echo $VUNTUM_MCP_URL` (it overrides the default).
2. Check that Node.js is version 20 or later: `node --version`.
3. Check that the host answers: `curl -I https://vuntum.com/mcp`. A bare request is not a valid
   MCP request, so an HTTP 4xx code still shows the host is reachable.

## A robot or value is missing

A missing value means Vuntum has not found a reliable source yet, not that the answer is "no".
See [LIMITATIONS.md](LIMITATIONS.md).

## The assistant answers in French

Texts are in French by default. Ask for English, or pass `locale: "en"` where it is accepted.

## The connector does not appear in the client

Menu names change between versions. Follow the current documentation of your client, linked from
[INSTALLATION.md](INSTALLATION.md).
