/**
 * Structured JSON lines on stderr (stdout carries the protocol in stdio mode).
 * Never pass a key, a header or an address to it: the HTTP server logs a key's
 * prefix only (`keyForLog`), and never the visitor's address.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(fields: Record<string, unknown> | string, message?: string): void;
  info(fields: Record<string, unknown> | string, message?: string): void;
  warn(fields: Record<string, unknown> | string, message?: string): void;
  error(fields: Record<string, unknown> | string, message?: string): void;
}

function serialise(value: unknown): unknown {
  return value instanceof Error ? { name: value.name, message: value.message } : value;
}

export function getLogger(name: string, level: Level = (process.env['LOG_LEVEL'] as Level | undefined) ?? 'info'): Logger {
  const min = ORDER[level] ?? ORDER.info;
  const write = (at: Level) => (fields: Record<string, unknown> | string, message?: string) => {
    if (ORDER[at] < min) return;
    const body = typeof fields === 'string' ? { msg: fields } : { ...fields, msg: message };
    const line = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, serialise(v)]));
    process.stderr.write(`${JSON.stringify({ time: new Date().toISOString(), level: at, name, ...line })}\n`);
  };
  return { debug: write('debug'), info: write('info'), warn: write('warn'), error: write('error') };
}
