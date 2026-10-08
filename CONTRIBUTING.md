# Contributing

Thanks for your interest. This repository contains client examples and the public description of the
Vuntum MCP server. The server code is not here, so changes to the server's behavior or data cannot be
made through a pull request.

## Welcome

- A fix or improvement to the documentation.
- A new client example (another language or MCP client), if it runs against `https://vuntum.com/mcp`
  and you ran it before sending it.
- A bug report: a command from this repository that fails, a wrong tool name, a dead link.

For an error in the data itself (a wrong price, a wrong spec), write to contact@vuntum.com, the
contact published on [vuntum.com](https://vuntum.com/fr/mentions-legales), with the robot sheet URL.

## Set up

Node.js 20 or later is required (`engines` in [`package.json`](package.json)).

```bash
git clone https://github.com/RAAAAAGEEEEE/vuntum-mcp
cd vuntum-mcp
npm install
npm run check
```

`npm run check` must print `OK: 16 tools, all read-only, get_robot answers with sourced data.`
If you add or remove a tool in the documentation, update the `EXPECTED` list in
[`examples/check.mjs`](examples/check.mjs) in the same pull request.

## Pull requests

1. Open an issue first for anything bigger than a typo.
2. Keep one subject per pull request.
3. Update the documentation and [`CHANGELOG.md`](CHANGELOG.md) in the same commit as the change.
4. Run every command you document, and paste the real output into the pull request.
5. Never include a key, a token or personal data.

By contributing, you agree that your contribution is released under the [MIT license](LICENSE).
Report security problems as described in [SECURITY.md](SECURITY.md), not in a public issue.
