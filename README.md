# Vuntum MCP server

Read-only [Model Context Protocol](https://modelcontextprotocol.io) server for [Vuntum](https://vuntum.com),
a French media outlet and database about consumer robots and physical AI: humanoids, robot dogs,
home and service robots. Every value it returns is dated and traceable to a sourced claim with its level
of evidence.

- **Endpoint:** `https://vuntum.com/mcp` (Streamable HTTP)
- **Free, no key, no sign-up.** 60 requests per minute per IP address.
- **Read-only:** 16 tools, all annotated `readOnlyHint: true`. Nothing can be written.
- **Registry name:** `com.vuntum/mcp` in the [official MCP registry](https://registry.modelcontextprotocol.io/v0/servers?search=com.vuntum)
- **Status:** live and in use; version 0.1.0 of the public description (see [CHANGELOG.md](CHANGELOG.md)).

> En français : serveur MCP public et gratuit de Vuntum, en lecture seule. Ajoutez l'adresse
> `https://vuntum.com/mcp` comme connecteur dans votre client (configurations dans
> [docs/INSTALLATION.md](docs/INSTALLATION.md), en anglais). Les textes renvoyés sont en français
> par défaut, en anglais avec `locale: "en"`.

## What it is for

It is for anyone who wants an AI assistant to answer robot questions from sourced data instead of
memory, and to link to the sheet on vuntum.com for each robot. Questions such as:

- "Which robots can climb stairs, and who says so?"
- "Compare the Unitree G1 and the Unitree H1."
- "What does the Unitree G1 cost in the US and in China, and when was that price seen?"

## Quickstart

Prerequisite: Node.js 20 or later.

```bash
git clone https://github.com/RAAAAAGEEEEE/vuntum-mcp
cd vuntum-mcp
npm install
npm run check
```

Expected output (run on 8 October 2026):

```
OK: 16 tools, all read-only, get_robot answers with sourced data.
```

To use the server from an assistant instead, add `https://vuntum.com/mcp` as a connector. In Claude Code:

```bash
claude mcp add --transport http vuntum https://vuntum.com/mcp
```

Other clients (claude.ai, Claude Desktop, ChatGPT, Cursor, VS Code): [docs/INSTALLATION.md](docs/INSTALLATION.md).

## Minimal example

`npm run quickstart -- "unitree"` lists the tools, then searches robots. Real answers (excerpts,
3 October 2026) and the 16 tools are in [docs/USAGE.md](docs/USAGE.md). The code is
[`examples/quickstart.mjs`](examples/quickstart.mjs): about twenty lines with the official SDK.

## How it works

A remote, stateless server: your client connects over HTTPS to `https://vuntum.com/mcp`, lists the
tools and calls them. Nothing runs locally. Detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Configuration

None for the server. The examples read one optional variable, `VUNTUM_MCP_URL`.
Detail: [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Security and privacy

Read-only, no key and no account. Your queries travel to vuntum.com over HTTPS, so do not put
personal data in them. Detail: [docs/PRIVACY_AND_SECURITY.md](docs/PRIVACY_AND_SECURITY.md). To
report a vulnerability: [SECURITY.md](SECURITY.md).

## Limits

- 60 HTTP requests per minute per IP address, then HTTP 429.
- Up to 50 results per call.
- French by default, English with `locale: "en"`.
- A missing value means Vuntum has not found a reliable source yet, not "no".
- Not meant for bulk use: see the export on [vuntum.com/fr/donnees](https://vuntum.com/fr/donnees).

Full list: [docs/LIMITATIONS.md](docs/LIMITATIONS.md). Problems: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Roadmap

Not a commitment: keep the examples and the documentation in line with the server's tools.

## Contributing

Documentation fixes, new client examples and bug reports are welcome:
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licences

- **Data:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Expected credit:
  "Source: Vuntum (https://vuntum.com), CC BY 4.0 licence", with a link to the sheet concerned.
- **Code in this repository** (examples, `server.json`): [MIT](LICENSE).

Detail: [docs/LEGAL_AND_ATTRIBUTION.md](docs/LEGAL_AND_ATTRIBUTION.md). This repository holds the
public description of the server and client examples. The server itself runs on vuntum.com.

## Documentation

[Installation](docs/INSTALLATION.md) · [Usage and tools](docs/USAGE.md) ·
[Architecture](docs/ARCHITECTURE.md) · [Configuration](docs/CONFIGURATION.md) ·
[Troubleshooting](docs/TROUBLESHOOTING.md) · [Limitations](docs/LIMITATIONS.md) ·
[Privacy and security](docs/PRIVACY_AND_SECURITY.md) · [Legal and attribution](docs/LEGAL_AND_ATTRIBUTION.md) ·
[Changelog](CHANGELOG.md)

## Contact

contact@vuntum.com, or open an issue in this repository.
