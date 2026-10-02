// Connects to the public Vuntum MCP server, lists its tools, and runs a search.
// Usage: npm install && npm run quickstart -- "unitree"
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const SERVER_URL = process.env.VUNTUM_MCP_URL ?? 'https://vuntum.com/mcp';
const query = process.argv[2] ?? 'unitree';

const client = new Client({ name: 'vuntum-mcp-quickstart', version: '0.1.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(SERVER_URL)));

const { tools } = await client.listTools();
console.log(`${tools.length} tools: ${tools.map((t) => t.name).join(', ')}\n`);

const result = await client.callTool({ name: 'search_robots', arguments: { query, limit: 5 } });
const payload = JSON.parse(result.content[0].text);
for (const robot of payload.results) {
  console.log(`${robot.name} (${robot.manufacturer})  ${robot.url}`);
}

await client.close();
