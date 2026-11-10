import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { wrapPglite, type SqlClient } from '../data/sql-client.js';

/** An in-process PostgreSQL (PGlite) loaded with `sql/schema.sql` and the fictitious `sql/seed.sql`. */
export async function createSeededDatabase(): Promise<SqlClient> {
  const client = wrapPglite(new PGlite());
  for (const file of ['schema.sql', 'seed.sql']) {
    await client.exec(readFileSync(new URL(`../../sql/${file}`, import.meta.url), 'utf8'));
  }
  return client;
}
