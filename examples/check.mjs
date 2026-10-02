// Smoke test: every tool the README documents must be exposed by the server,
// and a read-only call must answer with sourced data.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const SERVER_URL = process.env.VUNTUM_MCP_URL ?? 'https://vuntum.com/mcp';
const EXPECTED = [
  'get_methodology', 'search_robots', 'search_site', 'get_article', 'get_robot',
  'get_robot_claims', 'get_robot_sources', 'get_robot_prices', 'get_robot_availability',
  'compare_robots', 'find_home_robots', 'find_robots_by_utility', 'find_robots_by_capability',
  'find_programmable_robots', 'get_recent_changes', 'search_open_source_projects',
];

const client = new Client({ name: 'vuntum-mcp-check', version: '0.1.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(SERVER_URL)));
const { tools } = await client.listTools();
const names = new Set(tools.map((t) => t.name));
const missing = EXPECTED.filter((n) => !names.has(n));
const notReadOnly = tools.filter((t) => t.annotations?.readOnlyHint !== true).map((t) => t.name);
const robot = JSON.parse((await client.callTool({ name: 'get_robot', arguments: { slug: 'unitree-g1' } })).content[0].text);
await client.close();

if (missing.length || notReadOnly.length || !robot.disclaimer) {
  console.error({ missing, notReadOnly, hasDisclaimer: Boolean(robot.disclaimer) });
  process.exit(1);
}
console.log(`OK: ${tools.length} tools, all read-only, get_robot answers with sourced data.`);
