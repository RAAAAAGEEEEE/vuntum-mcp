# Vuntum MCP server

[![Vuntum MCP server](https://glama.ai/mcp/servers/RAAAAAGEEEEE/vuntum-mcp/badges/score.svg)](https://glama.ai/mcp/servers/RAAAAAGEEEEE/vuntum-mcp)

[Français](#français) · [English](#english)

---

## Français

Serveur [Model Context Protocol](https://modelcontextprotocol.io) de [Vuntum](https://vuntum.com),
le média et la base de données française sur les robots grand public et l'IA physique : humanoïdes,
robots chiens, robots de maison et de service. Chaque valeur renvoyée est datée et rattachée à une
source, avec son niveau de preuve.

Ce dépôt contient :

- le **code source du serveur** (dossier [`server/`](server/)), sous licence MIT ;
- la description publique du serveur (`server.json`, `glama.json`) et des exemples de clients
  ([`examples/`](examples/)).

### L'outil est libre, pas la base

| | Licence | Dans ce dépôt ? |
|---|---|---|
| Code (serveur, exemples, schéma SQL) | [MIT](LICENSE) | Oui |
| Données Vuntum (fiches, prix, sources) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) | **Non** |

Les données de Vuntum ne sont pas copiées ici. Le fichier `server/sql/seed.sql` ne contient que
trois robots **fictifs** (« Demo Robot A », « Demo Robot B », « Demo Robot C »), avec des sources
sur example.com. Ils servent seulement à lancer le serveur chez soi.

Licence des données servies par vuntum.com : CC BY-NC 4.0 pour les versions publiées depuis le
24 octobre 2026 (versions plus anciennes : CC BY 4.0). Attribution obligatoire : reprendre le champ
`attribution` de la réponse, avec le lien de la fiche. Détail :
[docs/LEGAL_AND_ATTRIBUTION.md](docs/LEGAL_AND_ATTRIBUTION.md).

### Utiliser le serveur public (rien à installer)

Le serveur public reste ouvert à tous : `https://vuntum.com/mcp` (Streamable HTTP), sans clé ni
compte. Dans Claude Code :

```bash
claude mcp add --transport http vuntum https://vuntum.com/mcp
```

Autres clients (claude.ai, Claude Desktop, ChatGPT, Cursor, VS Code) :
[docs/INSTALLATION.md](docs/INSTALLATION.md). Pour vérifier qu'il répond, à la racine du dépôt :
`npm install && npm run check` (sortie attendue : `OK: 20 tools, all read-only, get_robot answers
with sourced data.`).

- Gratuit : 100 appels d'outils par jour et par adresse IP, puis erreur HTTP 429. `initialize` et
  `tools/list` ne comptent jamais.
- Attribution obligatoire : chaque réponse porte un champ `attribution` à reprendre avec les données.
- Usage commercial : accès pro sur demande,
  [vuntum.com/fr/api-mcp#acces-pro](https://vuntum.com/fr/api-mcp#acces-pro).
- Lecture seule : 20 outils, tous annotés `readOnlyHint: true`.
- Textes en français par défaut, en anglais avec `locale: "en"`. 50 résultats au plus par appel.
- Nom dans le registre MCP officiel : `com.vuntum/mcp`.

### Ce que le code montre

Le code de [`server/src`](server/src) est celui qui tourne sur vuntum.com, sans les données.

- **Quota par adresse, sur `tools/call` seulement** ([`access.ts`](server/src/access.ts)). Une
  adresse a droit à 100 appels d'outils par jour (jour UTC). Les autres messages du protocole
  (`initialize`, `tools/list`) ne comptent jamais : un annuaire qui vérifie que le serveur répond
  ne reçoit jamais d'erreur 429. Une adresse IPv6 compte pour son préfixe /64 entier, puis pour
  son /48 entier dès que plus de 32 /64 du même /48 se présentent dans la journée. Un connecteur
  d'assistant IA a 2 000 appels par jour, seulement si son adresse figure dans la liste officielle
  publiée par son éditeur ([`net/robot-ranges.ts`](server/src/net/robot-ranges.ts)) : écrire
  « ChatGPT-User » dans un en-tête ne suffit pas. Les annuaires MCP connus, reconnus à leur seul
  nom, ont 300 appels par jour.
- **Accès pro par clé hachée en SHA-256** ([`data/api-keys.ts`](server/src/data/api-keys.ts)). La
  clé arrive par `Authorization: Bearer vtm_...` ou `X-Vuntum-Key`. La base ne garde que son
  empreinte SHA-256, lue par une fonction SQL : le rôle du serveur ne voit jamais la table des
  clés. Une clé inconnue ou révoquée reçoit une erreur 403, jamais un retour discret à l'accès
  gratuit. Le résultat est gardé une minute en mémoire. Les journaux n'écrivent que `vtm_` et
  les huit caractères qui suivent.
- **Attribution et licence dans chaque réponse** ([`terms.ts`](server/src/terms.ts)). Chaque
  réponse commence par `attribution` (la phrase à citer, avec le lien de la fiche) et `license`
  (CC BY-NC 4.0 sans clé, licence commerciale avec une clé pro). Un test vérifie que chaque
  outil passe par là.
- **Garde HTTP** ([`http-guard.ts`](server/src/http-guard.ts),
  [`server-http.ts`](server/src/server-http.ts)). POST seulement, corps limité à 64 Kio, un seul
  message JSON-RPC par requête, limite par minute et par adresse. Les en-têtes `X-Real-IP` et
  `X-Forwarded-For` ne sont crus que s'ils viennent d'un proxy (boucle locale ou réseau privé)
  ([`net/client-ip.ts`](server/src/net/client-ip.ts)). Le serveur est sans état : un serveur MCP
  neuf par requête.
- **Arrêt propre** ([`graceful-shutdown.ts`](server/src/graceful-shutdown.ts)). Sur SIGTERM, le
  serveur répond encore 5 secondes avec `Connection: close`, puis cesse d'écouter, puis laisse
  finir les requêtes en cours (12 secondes au plus). Un redémarrage ne coupe aucune requête.
- **Lecture seule à chaque étage.** Les outils passent par une interface de lecture
  ([`data/reader.ts`](server/src/data/reader.ts)). Son adaptateur PostgreSQL
  ([`data/sql-reader.ts`](server/src/data/sql-reader.ts)) ne lit que des relations `public_*`,
  avec un rôle en lecture seule ([`sql/readonly-role.sql`](server/sql/readonly-role.sql)).

### Lancer le serveur chez soi

Prérequis : Node.js 20 ou plus récent ; Docker pour la base de démonstration.

**En HTTP, avec Docker Compose** (PostgreSQL + données fictives + serveur) :

```bash
git clone https://github.com/RAAAAAGEEEEE/vuntum-mcp
cd vuntum-mcp/server
docker compose up -d --build
curl http://127.0.0.1:3001/health
```

Le serveur répond sur `http://127.0.0.1:3001/mcp`. Les mots de passe de `docker-compose.yml` ne
servent qu'à cette démonstration locale : la base n'écoute que sur 127.0.0.1.

**En stdio** (le client lance le serveur lui-même), avec la base de Docker Compose :

```bash
cd vuntum-mcp/server
npm ci
npm run build
DATABASE_URL=postgres://vuntum_mcp_ro:local-demo-readonly-only@127.0.0.1:5432/vuntum node dist/server-stdio.js
```

**Brancher un client** : configurations prêtes pour Claude Desktop, Claude Code et Cursor dans
[`examples/local/`](examples/local/). Avec Claude Code, en HTTP :

```bash
claude mcp add --transport http vuntum-local http://127.0.0.1:3001/mcp
```

**Tests** (sans Docker : une base PostgreSQL en mémoire, PGlite, charge le schéma et les données
fictives) :

```bash
cd server
npm ci && npm test && npm run build
```

**Variables d'environnement** : `DATABASE_URL` (obligatoire, rôle en lecture seule),
`VUNTUM_PUBLIC_URL` (`https://vuntum.com` par défaut, base des liens), `MCP_HOST` (`127.0.0.1`
par défaut), `MCP_PORT` (`3001` par défaut), `LOG_LEVEL` (`info` par défaut). Aucune n'a de mot
de passe par défaut.

**Avec vos propres données** : créez les tables de [`server/sql/schema.sql`](server/sql/schema.sql)
(ou des vues de même forme sur votre modèle), puis le rôle de
[`server/sql/readonly-role.sql`](server/sql/readonly-role.sql). Pour une clé pro de test, insérez
dans `api_key` l'empreinte SHA-256 (en hexadécimal) d'une clé faite de `vtm_` suivi de
43 caractères base64url. Ne stockez jamais la clé elle-même.

### Documentation

[Architecture](docs/ARCHITECTURE.md) · [Installation](docs/INSTALLATION.md) ·
[Usage et outils](docs/USAGE.md) · [Limites](docs/LIMITATIONS.md) ·
[Sécurité](SECURITY.md) · [Contribuer](CONTRIBUTING.md) · [Changements](CHANGELOG.md)
(documents en anglais).

Contact : contact@vuntum.com, ou une issue dans ce dépôt. Une erreur dans les données se signale
par e-mail, avec l'adresse de la fiche.

---

## English

[Model Context Protocol](https://modelcontextprotocol.io) server of [Vuntum](https://vuntum.com),
the French media outlet and database about consumer robots and physical AI: humanoids, robot dogs,
home and service robots. Every value it returns is dated and tied to a source, with its level of
evidence.

This repository holds:

- the **source code of the server** (folder [`server/`](server/)), under the MIT license;
- the public description of the server (`server.json`, `glama.json`) and client examples
  ([`examples/`](examples/)).

### The tool is open source, the database is not

| | License | In this repository? |
|---|---|---|
| Code (server, examples, SQL schema) | [MIT](LICENSE) | Yes |
| Vuntum data (robot sheets, prices, sources) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) | **No** |

The Vuntum data is not copied here. `server/sql/seed.sql` only holds three **fictitious** robots
("Demo Robot A", "Demo Robot B", "Demo Robot C"), with sources on example.com. They are only there
so that you can run the server on your own machine.

License of the data served by vuntum.com: CC BY-NC 4.0 for the versions published since
24 October 2026 (earlier versions: CC BY 4.0). Attribution is mandatory: reproduce the
`attribution` field of the response, with the link to the robot sheet. Detail:
[docs/LEGAL_AND_ATTRIBUTION.md](docs/LEGAL_AND_ATTRIBUTION.md).

### Use the public server (nothing to install)

The public server stays open to everyone: `https://vuntum.com/mcp` (Streamable HTTP), no key, no
account. In Claude Code:

```bash
claude mcp add --transport http vuntum https://vuntum.com/mcp
```

Other clients (claude.ai, Claude Desktop, ChatGPT, Cursor, VS Code):
[docs/INSTALLATION.md](docs/INSTALLATION.md). To check that it answers, at the root of the
repository: `npm install && npm run check` (expected output: `OK: 20 tools, all read-only,
get_robot answers with sourced data.`).

- Free: 100 tool calls per day per IP address, then HTTP 429. `initialize` and `tools/list` never
  count.
- Attribution is mandatory: every response carries an `attribution` field to reproduce with the data.
- Commercial use: pro access on request,
  [vuntum.com/fr/api-mcp#acces-pro](https://vuntum.com/fr/api-mcp#acces-pro).
- Read-only: 20 tools, all annotated `readOnlyHint: true`.
- Texts in French by default, in English with `locale: "en"`. At most 50 results per call.
- Name in the official MCP registry: `com.vuntum/mcp`.

### What the code shows

The code in [`server/src`](server/src) is the code that runs on vuntum.com, without the data.

- **Quota per address, on `tools/call` only** ([`access.ts`](server/src/access.ts)). An address
  gets 100 tool calls per day (UTC day). The other protocol messages (`initialize`, `tools/list`)
  never count, so a directory that checks that the server is up never gets a 429. An IPv6 address
  counts for its whole /64 prefix, then for its whole /48 once more than 32 /64 of the same /48
  show up in a day. The connector of an AI assistant gets 2,000 a day, only when its address is in
  the official list published by its operator
  ([`net/robot-ranges.ts`](server/src/net/robot-ranges.ts)): writing "ChatGPT-User" in a header is
  not enough. Known MCP directories, recognised by name only, get 300 a day.
- **Pro access by a key hashed with SHA-256** ([`data/api-keys.ts`](server/src/data/api-keys.ts)).
  The key comes in `Authorization: Bearer vtm_...` or `X-Vuntum-Key`. The database only keeps its
  SHA-256 digest, read through an SQL function: the server's role never sees the key table. An
  unknown or revoked key gets a 403, never a silent fall back to the free access. The result is
  cached for one minute in memory. The logs only write `vtm_` and the eight characters after it.
- **Attribution and license in every answer** ([`terms.ts`](server/src/terms.ts)). Every answer
  starts with `attribution` (the sentence to quote, with the link to the robot sheet) and `license`
  (CC BY-NC 4.0 without a key, commercial license with a pro key). A test checks that every tool
  goes through it.
- **HTTP guard** ([`http-guard.ts`](server/src/http-guard.ts),
  [`server-http.ts`](server/src/server-http.ts)). POST only, body limited to 64 KiB, one JSON-RPC
  message per request, a per-minute limit per address. The `X-Real-IP` and `X-Forwarded-For`
  headers are only believed when they come from a proxy (loopback or private network)
  ([`net/client-ip.ts`](server/src/net/client-ip.ts)). The server is stateless: a fresh MCP server
  for each request.
- **Graceful shutdown** ([`graceful-shutdown.ts`](server/src/graceful-shutdown.ts)). On SIGTERM,
  the server keeps answering for 5 seconds with `Connection: close`, then stops listening, then
  lets the requests in progress finish (12 seconds at most). A restart cuts no request.
- **Read-only at every level.** The tools go through a read interface
  ([`data/reader.ts`](server/src/data/reader.ts)). Its PostgreSQL adapter
  ([`data/sql-reader.ts`](server/src/data/sql-reader.ts)) only reads `public_*` relations, with a
  read-only role ([`sql/readonly-role.sql`](server/sql/readonly-role.sql)).

### Run the server on your machine

Prerequisites: Node.js 20 or later; Docker for the demo database.

**Over HTTP, with Docker Compose** (PostgreSQL + fictitious data + server):

```bash
git clone https://github.com/RAAAAAGEEEEE/vuntum-mcp
cd vuntum-mcp/server
docker compose up -d --build
curl http://127.0.0.1:3001/health
```

The server answers on `http://127.0.0.1:3001/mcp`. The passwords in `docker-compose.yml` are only
for this local demo: the database only listens on 127.0.0.1.

**Over stdio** (the client starts the server itself), with the Docker Compose database:

```bash
cd vuntum-mcp/server
npm ci
npm run build
DATABASE_URL=postgres://vuntum_mcp_ro:local-demo-readonly-only@127.0.0.1:5432/vuntum node dist/server-stdio.js
```

**Connect a client**: ready configurations for Claude Desktop, Claude Code and Cursor in
[`examples/local/`](examples/local/). With Claude Code, over HTTP:

```bash
claude mcp add --transport http vuntum-local http://127.0.0.1:3001/mcp
```

**Tests** (no Docker: an in-memory PostgreSQL, PGlite, loads the schema and the fictitious data):

```bash
cd server
npm ci && npm test && npm run build
```

**Environment variables**: `DATABASE_URL` (required, a read-only role), `VUNTUM_PUBLIC_URL`
(`https://vuntum.com` by default, base of the links), `MCP_HOST` (`127.0.0.1` by default),
`MCP_PORT` (`3001` by default), `LOG_LEVEL` (`info` by default). None has a default password.

**With your own data**: create the tables of [`server/sql/schema.sql`](server/sql/schema.sql) (or
views of the same shape over your own model), then the role of
[`server/sql/readonly-role.sql`](server/sql/readonly-role.sql). For a test pro key, insert into
`api_key` the SHA-256 digest (in hexadecimal) of a key made of `vtm_` followed by 43 base64url
characters. Never store the key itself.

### Documentation

[Architecture](docs/ARCHITECTURE.md) · [Installation](docs/INSTALLATION.md) ·
[Usage and tools](docs/USAGE.md) · [Limitations](docs/LIMITATIONS.md) ·
[Security](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md).

Contact: contact@vuntum.com, or an issue in this repository. Report an error in the data by e-mail,
with the address of the robot sheet.
