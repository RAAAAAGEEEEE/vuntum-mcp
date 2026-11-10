import { CachedRobotRanges, nameIsBelieved, type RobotRanges } from './net/robot-ranges.js';
import { apiKeyPrefix, DailyQuota, KeyChecker, presentedApiKey, secondsToUtcMidnight, type ApiKeyGrant } from './data/api-keys.js';

export { DailyQuota, KeyChecker, secondsToUtcMidnight };
export const presentedKey = presentedApiKey;

/**
 * Free and pro access to the MCP server.
 *
 * Free: no key, a daily quota of tool calls per address. Only `tools/call`
 * counts: `initialize`, `tools/list` and the other protocol messages never do,
 * so the liveness probes of the MCP directories (measured on 24 and 25/10,
 * 3 950 POST a day, nearly all from them) are never answered 429 for checking
 * that the server is up. Directory agents and the connectors of AI assistants
 * named below get a higher daily quota of tool calls, with the same free
 * answers: an assistant's connector calls from a few addresses shared by all
 * its users (Claude-User from 160.79.106.x), and a quota per address would
 * cut the quoting of Vuntum by AI assistants, which is what the free access is for.
 *
 * Pro: a key (`Authorization: Bearer vtm_...` or `X-Vuntum-Key`), checked
 * against its hash; the key's own daily quota and a higher per-minute limit.
 */

export const PUBLIC_DAILY_TOOL_CALLS = 100;
export const DIRECTORY_DAILY_TOOL_CALLS = 2_000;
export const PUBLIC_PER_MINUTE = 60;
export const PRO_PER_MINUTE = 600;

export const PRO_ACCESS_URL = {
  fr: 'https://vuntum.com/fr/entreprise#demande',
  en: 'https://vuntum.com/en/business#demande',
} as const;

/** MCP directories and monitors seen in the nginx log of 24 and 25/10/2026, each with its bot page. */
const DIRECTORY_AGENTS =
  /\b(FixterMonitoring|mcpbeat|rokmcp-collector|AgentRankProbe|BrickBlueBot|EveryMCP-Probe|agent-tools\.cloud-crawler|SynticConnectorProber|protogrid-probe|agentprobe|w4st3d-mcp-health|smartbench-mcp-gather|PriviScan|Moonglade|mcptry\.com indexer|mcp-studio-verifier|MCPStationBot|mcp-risk-scanner|mcplantern-check|lowdown-scanner|glama|smithery|pulsemcp|mcp\.so)\b/i;

export function isDirectoryAgent(userAgent: string | undefined): boolean {
  return userAgent !== undefined && DIRECTORY_AGENTS.test(userAgent);
}

/** Connectors of AI assistants run by a platform for its users (not a developer's own client such as claude-code). */
const ASSISTANT_AGENTS = /\b(Claude-User|ChatGPT-User|OpenAI-MCP|Perplexity-User|MistralAI-User|Gemini-User)\b/i;

export function isAssistantAgent(userAgent: string | undefined): boolean {
  return userAgent !== undefined && ASSISTANT_AGENTS.test(userAgent);
}

/**
 * Official address lists of the assistants that publish one. A scanner writing
 * "ChatGPT-User" must not draw on the shared quota of the real connectors: a name outside its
 * official addresses, or before the lists are loaded, gets the public quota.
 */
let robotRanges: { ready(): Promise<void>; readonly ranges: RobotRanges | null } = new CachedRobotRanges();

/** Tests: fixed lists instead of the daily download. */
export function useRobotRanges(ranges: RobotRanges | null): void {
  robotRanges = { ready: async () => undefined, ranges };
}

export function readyRobotRanges(): Promise<void> {
  return robotRanges.ready();
}

export function isVerifiedAssistant(
  userAgent: string | undefined,
  ip: string | undefined,
  ranges: RobotRanges | null = robotRanges.ranges,
): boolean {
  return isAssistantAgent(userAgent) && nameIsBelieved(ranges, userAgent, ip);
}

/** The JSON-RPC messages of a body that call a tool (the guard allows one message, alone or in a batch of one). */
export function toolCallCount(body: unknown): number {
  const messages = Array.isArray(body) ? body : [body];
  return messages.filter(
    (m) => typeof m === 'object' && m !== null && (m as { method?: unknown }).method === 'tools/call',
  ).length;
}

/** The JSON-RPC id of the message, to answer the client's own request. */
export function messageId(body: unknown): string | number | null {
  const first = Array.isArray(body) ? body[0] : body;
  const id = typeof first === 'object' && first !== null ? (first as { id?: unknown }).id : undefined;
  return typeof id === 'string' || typeof id === 'number' ? id : null;
}

export function keyForLog(key: string): string {
  return `vtm_${apiKeyPrefix(key)}…`;
}

export interface RpcError {
  readonly status: number;
  readonly body: { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string; data: Record<string, unknown> } };
}

export function quotaExceeded(id: string | number | null, limit: number): RpcError {
  return {
    status: 429,
    body: {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32029,
        message:
          `Free daily quota reached: ${limit} tool calls per day and address. ` +
          `Pro access (higher quotas, commercial licence): ${PRO_ACCESS_URL.en} ` +
          `| Quota gratuit du jour atteint : ${limit} appels d’outils par jour et par adresse. ` +
          `Accès pro (quotas élevés, licence commerciale) : ${PRO_ACCESS_URL.fr}`,
        data: { limit, period: 'UTC day', proAccess: PRO_ACCESS_URL },
      },
    },
  };
}

export function keyRefused(id: string | number | null): RpcError {
  return {
    status: 403,
    body: {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32003,
        message:
          `Unknown or revoked API key. Remove it to use the free access, or see ${PRO_ACCESS_URL.en} ` +
          `| Clé inconnue ou révoquée. Retirez-la pour l’accès gratuit, ou voir ${PRO_ACCESS_URL.fr}`,
        data: { proAccess: PRO_ACCESS_URL },
      },
    },
  };
}

export type Admission =
  | { readonly ok: true; readonly access: 'public' | 'pro'; readonly grant: ApiKeyGrant | null; readonly toolCalls: number }
  | { readonly ok: false; readonly error: RpcError };

/**
 * The access a request gets: a presented key must be live (else 403, never a
 * silent fall back to the free access), and its tool calls must fit in the
 * day's quota of the key, of the directory agent or of the address.
 */
export async function admit(input: {
  readonly body: unknown;
  readonly bucket: string;
  /** The visitor's address, to check a robot's name against its operator's official list. */
  readonly ip?: string | undefined;
  /** Lists to check against (default: the daily download). */
  readonly ranges?: RobotRanges | null | undefined;
  readonly userAgent: string | undefined;
  readonly key: string | null;
  readonly keys: Pick<KeyChecker, 'check'>;
  readonly quota: DailyQuota;
  readonly now?: Date;
}): Promise<Admission> {
  const id = messageId(input.body);
  const grant = input.key === null ? null : await input.keys.check(input.key);
  if (input.key !== null && grant === null) return { ok: false, error: keyRefused(id) };
  const toolCalls = toolCallCount(input.body);
  if (toolCalls > 0) {
    const [bucket, limit] = grant
      ? [`pro:${grant.keyId}`, grant.dailyQuota]
      : isDirectoryAgent(input.userAgent) || isVerifiedAssistant(input.userAgent, input.ip, input.ranges === undefined ? robotRanges.ranges : input.ranges)
        ? [`shared:${input.bucket}`, DIRECTORY_DAILY_TOOL_CALLS]
        : [input.bucket, PUBLIC_DAILY_TOOL_CALLS];
    if (!input.quota.take(bucket, limit, toolCalls, input.now).allowed) {
      return { ok: false, error: quotaExceeded(id, limit) };
    }
  }
  return { ok: true, access: grant ? 'pro' : 'public', grant, toolCalls };
}
