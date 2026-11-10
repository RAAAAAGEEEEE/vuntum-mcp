/**
 * Official address ranges of AI robots and search engines.
 *
 * A robot is never recognised on its User-Agent alone: anyone can write
 * "ChatGPT-User" in a header. On 03/11/2026, on another site, 165 of the
 * 198 "ChatGPT-User" visits in the nginx log were scanners (.env, .git, .ssh) and
 * that none of the 130 verifiable addresses was in OpenAI's published list.
 * The lists below are the ones each operator publishes; a name whose address
 * is outside its list is "spoofed", and it gets no robot treatment.
 *
 * Anthropic's page lists the addresses of Claude-User (tool calls made for a user); its crawlers
 * ClaudeBot and Claude-SearchBot have no list. Robots with no published list (ClaudeBot, Applebot, Amazonbot, CCBot, Bytespider,
 * Meta-ExternalAgent, DuckAssistBot...) stay on their name: nothing can check them.
 */

export type RobotList =
  | 'googlebot'
  | 'bingbot'
  | 'gptbot'
  | 'oai-searchbot'
  | 'chatgpt-user'
  | 'anthropic'
  | 'perplexitybot'
  | 'perplexity-user'
  | 'mistralai-user';

/** Official URLs, each read on 03/11/2026 (creationTime in the file is kept with the list). */
export const ROBOT_LIST_URLS: Readonly<Partial<Record<RobotList, string>>> = {
  googlebot: 'https://developers.google.com/static/search/apis/ipranges/googlebot.json',
  bingbot: 'https://www.bing.com/toolbox/bingbot.json',
  gptbot: 'https://openai.com/gptbot.json',
  'oai-searchbot': 'https://openai.com/searchbot.json',
  'chatgpt-user': 'https://openai.com/chatgpt-user.json',
  perplexitybot: 'https://www.perplexity.ai/perplexitybot.json',
  'perplexity-user': 'https://www.perplexity.ai/perplexity-user.json',
  'mistralai-user': 'https://mistral.ai/mistralai-user-ips.json',
};

/**
 * Anthropic publishes its outbound addresses on a documentation page, not as JSON
 * (https://platform.claude.com/docs/en/api/ip-addresses, read on 03/11/2026).
 */
export const ANTHROPIC_PREFIXES: readonly string[] = ['160.79.104.0/21', '2607:6bc0::/48'];

/** First match wins: the specific names before the generic ones. */
const AGENT_LISTS: readonly (readonly [RobotList, RegExp])[] = [
  ['oai-searchbot', /OAI-SearchBot/i],
  ['chatgpt-user', /ChatGPT-User/i],
  ['gptbot', /GPTBot/i],
  // ClaudeBot and Claude-SearchBot (the crawlers) are not here: Anthropic publishes no list for them, and the
  // 195 ClaudeBot visits seen on vuntum.com in 7 days came from Amazon addresses (216.73.216.0/22), not from its page.
  ['anthropic', /Claude-User/i],
  ['perplexity-user', /Perplexity-User/i],
  ['perplexitybot', /PerplexityBot/i],
  ['mistralai-user', /MistralAI-User/i],
  ['googlebot', /Googlebot/i],
  ['bingbot', /bingbot/i],
];

/** The list that vouches for this User-Agent, or null when its robot publishes none. */
export function robotListOf(userAgent: string | null | undefined): RobotList | null {
  if (!userAgent) return null;
  for (const [list, pattern] of AGENT_LISTS) if (pattern.test(userAgent)) return list;
  return null;
}

interface Prefix {
  readonly v6: boolean;
  readonly base: bigint;
  readonly bits: number;
}

function parseV4(text: string): bigint | null {
  const parts = text.split('.');
  if (parts.length !== 4) return null;
  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    value = (value << 8n) | BigInt(part);
  }
  return value;
}

function parseV6(text: string): bigint | null {
  let address = text;
  const tail = address.match(/:(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const v4 = parseV4(tail[1] as string);
    if (v4 === null) return null;
    address = `${address.slice(0, address.length - (tail[1] as string).length)}${(v4 >> 16n).toString(16)}:${(v4 & 0xffffn).toString(16)}`;
  }
  const halves = address.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? (halves[0] as string).split(':') : [];
  const rest = halves.length === 2 && halves[1] ? (halves[1] as string).split(':') : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...rest];
  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    value = (value << 16n) | BigInt(`0x${group}`);
  }
  return value;
}

/** An address as a number, with its family; "::ffff:a.b.c.d" is read as IPv4. */
function parseAddress(text: string): { v6: boolean; value: bigint } | null {
  const trimmed = text.trim().replace(/^\[|\]$/g, '');
  const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const plain = mapped ? (mapped[1] as string) : trimmed;
  if (plain.includes(':')) {
    const value = parseV6(plain);
    return value === null ? null : { v6: true, value };
  }
  const value = parseV4(plain);
  return value === null ? null : { v6: false, value };
}

export function parsePrefix(text: string): Prefix | null {
  const [address, length, extra] = text.trim().split('/');
  if (extra !== undefined || !address) return null;
  const parsed = parseAddress(address);
  if (!parsed) return null;
  const max = parsed.v6 ? 128 : 32;
  const bits = length === undefined ? max : /^\d{1,3}$/.test(length) ? Number(length) : -1;
  if (bits < 0 || bits > max) return null;
  const shift = BigInt(max - bits);
  return { v6: parsed.v6, base: (parsed.value >> shift) << shift, bits };
}

function inPrefix(prefix: Prefix, address: { v6: boolean; value: bigint }): boolean {
  if (prefix.v6 !== address.v6) return false;
  const shift = BigInt((prefix.v6 ? 128 : 32) - prefix.bits);
  return (address.value >> shift) << shift === prefix.base;
}

export interface RobotListData {
  /** Prefixes as published ("20.125.66.80/28"). */
  readonly prefixes: readonly string[];
  /** `creationTime` of the published file, or the date the page was read for Anthropic. */
  readonly published: string;
}

/** The prefixes of an operator's JSON file (`{ creationTime, prefixes: [{ ipv4Prefix | ipv6Prefix }] }`), or null if it is not that. */
export function parseListFile(text: string): RobotListData | null {
  try {
    const json = JSON.parse(text) as { creationTime?: unknown; prefixes?: unknown };
    if (!Array.isArray(json.prefixes)) return null;
    const prefixes: string[] = [];
    for (const entry of json.prefixes as Record<string, unknown>[]) {
      const value = entry?.['ipv4Prefix'] ?? entry?.['ipv6Prefix'];
      if (typeof value === 'string' && parsePrefix(value)) prefixes.push(value);
    }
    if (prefixes.length === 0) return null;
    return { prefixes, published: typeof json.creationTime === 'string' ? json.creationTime : '' };
  } catch {
    return null;
  }
}

export type RobotVerdict = 'verified' | 'spoofed' | 'unlisted' | 'unknown';

export interface RobotRangesSnapshot {
  /** Day (AAAA-MM-JJ, UTC) the lists were downloaded. */
  readonly fetchedDay: string;
  readonly lists: Partial<Record<RobotList, RobotListData>>;
}

/** Address check against the downloaded lists. */
export class RobotRanges {
  private readonly parsed = new Map<RobotList, Prefix[]>();

  constructor(readonly snapshot: RobotRangesSnapshot) {
    for (const [name, data] of Object.entries(snapshot.lists) as [RobotList, RobotListData][]) {
      this.parsed.set(name, data.prefixes.map(parsePrefix).filter((p): p is Prefix => p !== null));
    }
  }

  has(list: RobotList): boolean {
    return (this.parsed.get(list)?.length ?? 0) > 0;
  }

  /**
   * verified: the address is in the robot's list. spoofed: the robot has a list, loaded, and the
   * address is not in it. unknown: the list could not be loaded (do not trust the name either).
   * unlisted: this User-Agent is not one whose robot publishes a list.
   */
  verdict(userAgent: string | null | undefined, ip: string | null | undefined): RobotVerdict {
    const list = robotListOf(userAgent);
    if (list === null) return 'unlisted';
    const prefixes = this.parsed.get(list);
    const address = ip ? parseAddress(ip) : null;
    if (!prefixes || prefixes.length === 0 || address === null) return 'unknown';
    return prefixes.some((p) => inPrefix(p, address)) ? 'verified' : 'spoofed';
  }
}

export interface FetchRobotRangesOptions {
  readonly day: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  /** Lists already held (an older snapshot): kept for any list that cannot be downloaded now. */
  readonly previous?: RobotRangesSnapshot | null;
}

/** Downloads every official list. A list that fails keeps its previous copy, if any. */
export async function fetchRobotRanges(options: FetchRobotRangesOptions): Promise<RobotRangesSnapshot> {
  const doFetch = options.fetchImpl ?? fetch;
  const lists: Partial<Record<RobotList, RobotListData>> = { ...(options.previous?.lists ?? {}) };
  await Promise.all(
    (Object.entries(ROBOT_LIST_URLS) as [RobotList, string][]).map(async ([name, url]) => {
      try {
        const response = await doFetch(url, {
          headers: { 'user-agent': 'vuntum-mcp-robot-ranges/1.0 (+https://github.com/RAAAAAGEEEEE/vuntum-mcp)' },
          signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
        });
        if (!response.ok) return;
        const data = parseListFile(await response.text());
        if (data) lists[name] = data;
      } catch {
        /* keeps the previous copy */
      }
    }),
  );
  lists.anthropic = { prefixes: ANTHROPIC_PREFIXES, published: '2026-11-03' };
  return { fetchedDay: options.day, lists };
}

export const utcDay = (now: Date): string => now.toISOString().slice(0, 10);

/**
 * In-memory copy for the servers (web, MCP): downloaded on first use, refreshed once a day in
 * the background. `ready()` waits a few seconds for the first download; `check` never blocks.
 */
export class CachedRobotRanges {
  private current: RobotRanges | null = null;
  private inflight: Promise<void> | null = null;

  constructor(
    private readonly options: { fetchImpl?: typeof fetch; now?: () => Date; waitMs?: number } = {},
  ) {}

  private load(): Promise<void> {
    const now = (this.options.now ?? (() => new Date()))();
    this.inflight ??= fetchRobotRanges({
      day: utcDay(now),
      previous: this.current?.snapshot ?? null,
      ...(this.options.fetchImpl ? { fetchImpl: this.options.fetchImpl } : {}),
    })
      .then((snapshot) => {
        this.current = new RobotRanges(snapshot);
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  /** Starts the download when there is none or it is from another day; waits for it only the first time. */
  async ready(): Promise<void> {
    const today = utcDay((this.options.now ?? (() => new Date()))());
    if (this.current && this.current.snapshot.fetchedDay === today) return;
    const pending = this.load();
    if (this.current) return;
    await Promise.race([pending, new Promise<void>((resolve) => setTimeout(resolve, this.options.waitMs ?? 4_000))]);
  }

  /** Loaded lists, or null before the first download ends. */
  get ranges(): RobotRanges | null {
    return this.current;
  }
}

/**
 * Whether a shared-quota agent really is one: a name with a published list needs an address in it;
 * a name without a list stays on its name.
 */
export function nameIsBelieved(ranges: RobotRanges | null, userAgent: string | null | undefined, ip: string | null | undefined): boolean {
  if (robotListOf(userAgent) === null) return true;
  return ranges?.verdict(userAgent, ip) === 'verified';
}
