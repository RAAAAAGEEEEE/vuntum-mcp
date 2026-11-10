import postgres from 'postgres';

/**
 * One SQL surface, two engines: PostgreSQL in production (`createPostgresClient`)
 * and PGlite in the tests (`wrapPglite`, no Docker needed). Every query is
 * plain parameterised SQL with `$n` placeholders. The MCP server only reads.
 */
export interface SqlClient {
  readonly dialect: 'postgres' | 'pglite';
  /** Parameterised query. `$1`-style placeholders only. */
  query<T = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<T[]>;
  /** Multi-statement execution without parameters (schema and seed in tests). */
  exec(text: string): Promise<void>;
  close(): Promise<void>;
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Timestamps cross the boundary as ISO-8601 strings, never as `Date` objects:
 * the answers of the tools are defined on strings.
 */
function normalizeRow<T>(row: T): T {
  if (row === null || typeof row !== 'object') return row;
  if (row instanceof Date) return row.toISOString() as unknown as T;
  if (Array.isArray(row)) return row.map((item) => normalizeRow(item)) as unknown as T;
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    const normalized = value instanceof Date ? value.toISOString() : value;
    if (normalized !== value) changed = true;
    out[key] = normalized;
  }
  return changed ? (out as unknown as T) : row;
}

/** Never echo the connection string, which may carry a password. */
function describe(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/postgres(ql)?:\/\/[^\s]*/g, 'postgres://[redacted]');
  return String(error);
}

/**
 * Session limits of the read-only pool: a public statement is short, a slow
 * one is cancelled instead of holding a connection.
 */
export const PUBLIC_SESSION_LIMITS = {
  statement_timeout: 5000,
  idle_in_transaction_session_timeout: 10000,
  jit: 'off',
} as const;

export interface PostgresOptions {
  readonly max?: number;
  readonly connectTimeoutSeconds?: number;
  readonly applicationName?: string;
}

export function createPostgresClient(url: string, options: PostgresOptions = {}): SqlClient {
  const sql = postgres(url, {
    max: options.max ?? 10,
    connect_timeout: options.connectTimeoutSeconds ?? 10,
    idle_timeout: 30,
    prepare: false,
    onnotice: () => {},
    connection: {
      application_name: options.applicationName ?? 'vuntum-mcp',
      TimeZone: 'UTC',
      ...Object.fromEntries(Object.entries(PUBLIC_SESSION_LIMITS).map(([k, v]) => [k, String(v)])),
    },
  });
  return {
    dialect: 'postgres',
    async query<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
      try {
        const rows = await sql.unsafe(text, params as never[]);
        return (rows as unknown as T[]).map((row) => normalizeRow(row));
      } catch (error) {
        throw new DatabaseError(describe(error), error);
      }
    },
    async exec(text: string): Promise<void> {
      try {
        await sql.unsafe(text);
      } catch (error) {
        throw new DatabaseError(describe(error), error);
      }
    },
    async close(): Promise<void> {
      await sql.end({ timeout: 5 });
    },
  };
}

/** Minimal structural type of the PGlite instance the tests use. */
export interface PGliteLike {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(text: string): Promise<unknown>;
  close(): Promise<void>;
}

export function wrapPglite(db: PGliteLike): SqlClient {
  return {
    dialect: 'pglite',
    async query<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
      try {
        const result = await db.query<T>(text, [...params]);
        return result.rows.map((row) => normalizeRow(row));
      } catch (error) {
        throw new DatabaseError(describe(error), error);
      }
    },
    async exec(text: string): Promise<void> {
      try {
        await db.exec(text);
      } catch (error) {
        throw new DatabaseError(describe(error), error);
      }
    },
    close: () => db.close(),
  };
}

/** Convenience for `SELECT ... LIMIT 1` style reads. */
export async function queryOne<T = Record<string, unknown>>(
  client: SqlClient,
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await client.query<T>(text, params);
  return rows[0] ?? null;
}
