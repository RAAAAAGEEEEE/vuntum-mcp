import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDemoDatabase, DEMO_DATABASE_URL } from './data/demo-database.js';
import { createPostgresClient } from './data/sql-client.js';
import { createSqlReader } from './data/sql-reader.js';
import { loadEnv } from './env.js';
import { createMcpServer } from './server.js';

/** Local usage over stdio: an MCP client starts this process and talks to it on stdin/stdout. */
async function main(): Promise<void> {
  const env = loadEnv();
  // `DATABASE_URL=demo`: three fictitious robots in memory, nothing to install.
  const client =
    env.DATABASE_URL === DEMO_DATABASE_URL
      ? await createDemoDatabase()
      : createPostgresClient(env.DATABASE_URL, { max: 4 });
  const data = createSqlReader(client);
  const server = createMcpServer({ data, baseUrl: env.VUNTUM_PUBLIC_URL });
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  // stdout carries the protocol: diagnostics go to stderr.
  console.error('[vuntum-mcp] fatal:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
