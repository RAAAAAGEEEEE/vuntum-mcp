import { createSearchProvider } from './search.js';
import { getPublicRobotBySlug, getRobotFacts, listChangeHistory, listPublicChanges, listPublicRobots } from './catalog.js';
import { listComponentsForRobot } from './components.js';
import { listFactObservations } from './fact-sources.js';
import { listProgrammableRobots } from './programming.js';
import { listRobotIdentifiers } from './identifiers.js';
import { loadHumanoidTracker } from './humanoid-tracker.js';
import { lookupApiKey } from './api-keys.js';
import { queryOne, type SqlClient } from './sql-client.js';
import type { ArticleRow, AvailabilityRow, CapabilityProofRow, HomeRobotRow, PriceRow, RepositoryRow, RobotRef, RobotSourceRow, VuntumReader } from './reader.js';

/**
 * The PostgreSQL implementation of `VuntumReader`. Every statement is a
 * parameterised SELECT on a `public_*` table or view (see `sql/schema.sql`):
 * give it a role that can read those and nothing else.
 */
export function createSqlReader(client: SqlClient): VuntumReader {
  const search = createSearchProvider(client);
  return {
    search: (query, options) => search.search(query, options),

    findRobot: (slug) =>
      queryOne<RobotRef>(client, 'SELECT id, slug, name_usual FROM public_robot WHERE slug = $1', [slug]),

    getPublicRobotBySlug: (slug, options) => getPublicRobotBySlug(client, slug, options),

    getRobotFacts: (robotId) => getRobotFacts(client, robotId),

    // One line per source, not per snapshot: the latest access, the latest
    // publication date and how many claims rest on it.
    listRobotSources: (robotId) =>
      client.query<RobotSourceRow>(
        `SELECT source_id, source_name, source_url, bool_or(source_is_official) AS source_is_official,
                max(source_published_at) AS source_published_at, max(accessed_at) AS accessed_at,
                count(DISTINCT claim_id) AS claim_count
           FROM public_fact WHERE robot_id = $1 OR (subject_type = 'robot' AND subject_id = $1)
          GROUP BY source_id, source_name, source_url
          ORDER BY bool_or(source_is_official) DESC, count(DISTINCT claim_id) DESC, source_name`,
        [robotId],
      ),

    listRobotPrices: (robotId) =>
      client.query<PriceRow>(
        `SELECT market, price_type, amount, currency, claim_id, observed_at
           FROM public_price WHERE robot_id = $1 ORDER BY observed_at DESC`,
        [robotId],
      ),

    listRobotAvailability: (robotId) =>
      client.query<AvailabilityRow>(
        `SELECT market, state, claim_id, observed_at FROM public_availability
          WHERE robot_id = $1 ORDER BY observed_at DESC`,
        [robotId],
      ),

    listComponentsForRobot: (robotSlug) => listComponentsForRobot(client, robotSlug),

    listRobotIdentifiers: (robotId) => listRobotIdentifiers(client, robotId),

    getArticle: (slug, locale) =>
      queryOne<ArticleRow>(
        client,
        `SELECT slug, kind, title, standfirst, body, ai_assisted, published_at, updated_at, sources
           FROM public_article WHERE slug = $1 AND locale = $2`,
        [slug, locale],
      ),

    loadHumanoidTracker: (today) => loadHumanoidTracker(client, today),

    // A robot is "for the home" when an accepted claim says `tasks.household = yes`.
    listHomeRobots: (limit) =>
      client.query<HomeRobotRow>(
        `SELECT DISTINCT r.slug, r.name_usual, r.manufacturer_name
           FROM public_robot r
           JOIN public_fact f ON f.robot_id = r.id
          WHERE f.predicate = 'tasks.household' AND f.value->>'value' = 'yes'
          ORDER BY r.name_usual LIMIT $1`,
        [limit],
      ),

    listProgrammableRobots: (filters) => listProgrammableRobots(client, filters),

    listPublicRobots: (filters, options) => listPublicRobots(client, filters, options),

    listCapabilityProofs: (robotIds, capabilities) =>
      client.query<CapabilityProofRow>(
        `SELECT pc.robot_id, pc.capability, pc.claim_id, pc.evidence_level,
                f.source_name, f.source_url
           FROM public_robot_capability pc
           LEFT JOIN public_fact f ON f.claim_id = pc.claim_id
          WHERE pc.robot_id = ANY($1::text[]) AND pc.capability = ANY($2::text[])`,
        [[...robotIds], [...capabilities]],
      ),

    listPublicChanges: (limit) => listPublicChanges(client, limit),

    listChangeHistory: (filter) => listChangeHistory(client, filter),

    listFactObservations: (robotId, predicate) => listFactObservations(client, robotId, predicate),

    listRepositories: (query) =>
      client.query<RepositoryRow>(
        `SELECT slug, full_name, url, description_fr, license_spdx, stars, description_original,
                topics, is_official, pushed_at, api_fetched_at
           FROM public_repository
          WHERE $1 = '%%' OR full_name ILIKE $1 OR description_fr ILIKE $1 OR description_original ILIKE $1
          ORDER BY is_official DESC, stars DESC NULLS LAST`,
        [`%${query.trim()}%`],
      ),

    lookupApiKey: (key) => lookupApiKey(client, key),

    close: () => client.close(),
  };
}
