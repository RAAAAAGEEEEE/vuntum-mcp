import type { SqlClient } from '../data/sql-client.js';
import { createDemoDatabase } from '../data/demo-database.js';

/** An in-process PostgreSQL (PGlite) loaded with `sql/schema.sql` and the fictitious `sql/seed.sql`. */
export function createSeededDatabase(): Promise<SqlClient> {
  return createDemoDatabase();
}
