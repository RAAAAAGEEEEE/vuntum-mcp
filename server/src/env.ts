/**
 * The few settings of the server, read from the environment. No secret has a
 * default: without `DATABASE_URL` the server refuses to start.
 */
export interface ServerEnv {
  /** PostgreSQL connection string of a READ-ONLY role (see `sql/schema.sql`). */
  readonly DATABASE_URL: string;
  /** Base of the page addresses written in the answers and in `attribution`. */
  readonly VUNTUM_PUBLIC_URL: string;
  /** HTTP transport only. */
  readonly MCP_PORT: number;
  /** HTTP transport only: 127.0.0.1 by default, 0.0.0.0 inside a container. */
  readonly MCP_HOST: string;
  readonly LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

export function loadEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const url = source['DATABASE_URL']?.trim();
  if (!url) throw new Error('DATABASE_URL is not set (a PostgreSQL URL of a read-only role).');
  const port = Number(source['MCP_PORT'] ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('MCP_PORT must be a port number.');
  const level = source['LOG_LEVEL'] ?? 'info';
  return {
    DATABASE_URL: url,
    VUNTUM_PUBLIC_URL: (source['VUNTUM_PUBLIC_URL'] ?? 'https://vuntum.com').replace(/\/+$/, ''),
    MCP_PORT: port,
    MCP_HOST: source['MCP_HOST'] ?? '127.0.0.1',
    LOG_LEVEL: level === 'debug' || level === 'warn' || level === 'error' ? level : 'info',
  };
}
