import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer, SERVER_ICON, SERVER_VERSION } from './server.js';
import type { ToolContext } from './tools.js';

/**
 * Static server card (`/.well-known/mcp/server-card.json`, Smithery's "Static
 * Server Card"): lets a registry list the server without opening a session.
 *
 * It is built by asking the real server what it lists, so the card cannot
 * diverge from the code (`src/tools.test.ts` checks it lists every tool).
 */

export interface ServerCard {
  serverInfo: { name: string; title: string; version: string; icons: { src: string; mimeType: string; sizes: string[] }[] };
  authentication: { required: false };
  tools: { name: string; title?: string; description?: string; inputSchema: unknown; annotations?: unknown }[];
  resources: unknown[];
  prompts: unknown[];
}

export async function buildServerCard(): Promise<ServerCard> {
  // Listing tools never calls one: the database is not touched.
  const ctx = { data: undefined, baseUrl: 'https://vuntum.com' } as unknown as ToolContext;
  const server = createMcpServer(ctx);
  const client = new Client({ name: 'server-card', version: '1' });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  try {
    const { tools } = await client.listTools();
    const resources = client.getServerCapabilities()?.resources ? (await client.listResources()).resources : [];
    const prompts = client.getServerCapabilities()?.prompts ? (await client.listPrompts()).prompts : [];
    return {
      serverInfo: {
        name: 'Vuntum',
        title: 'Vuntum',
        version: SERVER_VERSION,
        icons: [{ src: SERVER_ICON, mimeType: 'image/png', sizes: ['512x512'] }],
      },
      authentication: { required: false },
      tools: tools.map((t) => ({
        name: t.name,
        ...(t.title ? { title: t.title } : {}),
        ...(t.description ? { description: t.description } : {}),
        inputSchema: t.inputSchema,
        ...(t.annotations ? { annotations: t.annotations } : {}),
      })),
      resources,
      prompts,
    };
  } finally {
    await client.close();
    await server.close();
  }
}
