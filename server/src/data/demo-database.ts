import { readFileSync } from 'node:fs';
import { wrapPglite, type SqlClient } from './sql-client.js';

/** Value of `DATABASE_URL` that starts the server on the in-memory demo database. */
export const DEMO_DATABASE_URL = 'demo';

/**
 * An in-process PostgreSQL (PGlite) loaded with `sql/schema.sql` and the
 * fictitious `sql/seed.sql` (three demo robots, sources on example.com).
 * Used by the tests and by `DATABASE_URL=demo`, so that the server can be
 * started and inspected without Docker, without a database and without any
 * Vuntum data.
 */
export async function createDemoDatabase(): Promise<SqlClient> {
  const { PGlite } = await import('@electric-sql/pglite');
  const client = wrapPglite(new PGlite());
  for (const file of ['schema.sql', 'seed.sql']) {
    await client.exec(readFileSync(new URL(`../../sql/${file}`, import.meta.url), 'utf8'));
  }
  return client;
}
