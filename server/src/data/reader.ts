import type { ApiKeyGrant } from './api-keys.js';
import type { CatalogOptions, ChangeHistoryFilter, ChangeHistoryRow, ListRobotsFilters, ListRobotsResult, PublicFactRow } from './catalog.js';
import type { FactObservationRow } from './fact-sources.js';
import type { ProgrammableFilters, ProgrammableRobotView } from './programming.js';
import type { RobotComponent } from './components.js';
import type { RobotIdentifier } from './identifiers.js';
import type { SearchHit, SearchOptions } from './search.js';
import type { RobotDetail } from '../domain/api.js';
import type { TrackerRow } from '../domain/humanoid-tracker.js';

/**
 * Everything the MCP tools read, behind one interface.
 *
 * The tools never write SQL: they call a `VuntumReader`. The PostgreSQL
 * implementation (`createSqlReader`, in `sql-reader.ts`) reads the `public_*`
 * tables or views only, through a read-only role. Another store (a JSON
 * export, SQLite, a test double) can be plugged in by implementing this
 * interface.
 */

export interface RobotRef {
  readonly id: string;
  readonly slug: string;
  readonly name_usual: string;
}

export interface ArticleRow {
  readonly slug: string;
  readonly kind: string;
  readonly title: string;
  readonly standfirst: string | null;
  readonly body: unknown;
  readonly ai_assisted: boolean;
  readonly published_at: string | null;
  readonly updated_at: string;
  readonly sources: unknown;
}

export interface RobotSourceRow {
  readonly source_id: string;
  readonly source_name: string;
  readonly source_url: string | null;
  readonly source_is_official: boolean;
  readonly source_published_at: string | null;
  readonly accessed_at: string;
  readonly claim_count: string | number;
}

export interface PriceRow {
  readonly market: string;
  readonly price_type: string;
  readonly amount: string;
  readonly currency: string;
  readonly claim_id: string;
  readonly observed_at: string;
}

export interface AvailabilityRow {
  readonly market: string;
  readonly state: string;
  readonly claim_id: string;
  readonly observed_at: string;
}

export interface HomeRobotRow {
  readonly slug: string;
  readonly name_usual: string;
  readonly manufacturer_name: string;
}

export interface CapabilityProofRow {
  readonly robot_id: string;
  readonly capability: string;
  readonly claim_id: string;
  readonly evidence_level: string;
  readonly source_name: string | null;
  readonly source_url: string | null;
}

export interface PublicChangeRow {
  readonly id: string;
  readonly entity_type: string;
  readonly entity_id: string;
  readonly kind: string;
  readonly summary_fr: string;
  readonly summary_en: string | null;
  readonly created_at: string;
}

export interface RepositoryRow {
  readonly slug: string;
  readonly full_name: string;
  readonly url: string;
  readonly description_fr: string | null;
  readonly license_spdx: string | null;
  readonly stars: number | null;
  readonly description_original: string | null;
  readonly topics: string[] | null;
  readonly is_official: boolean;
  readonly pushed_at: string | null;
  readonly api_fetched_at: string | null;
}

export interface VuntumReader {
  /** Site search over robots, makers and articles, by relevance. */
  search(query: string, options?: SearchOptions): Promise<SearchHit[]>;
  /** The id, slug and name of a published robot, or null. */
  findRobot(slug: string): Promise<RobotRef | null>;
  /** The full published sheet of a robot, or null. */
  getPublicRobotBySlug(slug: string, options?: CatalogOptions): Promise<RobotDetail | null>;
  getRobotFacts(robotId: string): Promise<PublicFactRow[]>;
  listRobotSources(robotId: string): Promise<RobotSourceRow[]>;
  listRobotPrices(robotId: string): Promise<PriceRow[]>;
  listRobotAvailability(robotId: string): Promise<AvailabilityRow[]>;
  listComponentsForRobot(robotSlug: string): Promise<RobotComponent[]>;
  listRobotIdentifiers(robotId: string): Promise<RobotIdentifier[]>;
  getArticle(slug: string, locale: 'fr' | 'en'): Promise<ArticleRow | null>;
  loadHumanoidTracker(today?: string): Promise<TrackerRow[]>;
  listHomeRobots(limit: number): Promise<HomeRobotRow[]>;
  listProgrammableRobots(filters?: ProgrammableFilters): Promise<ProgrammableRobotView[]>;
  listPublicRobots(filters?: ListRobotsFilters, options?: CatalogOptions): Promise<ListRobotsResult>;
  listCapabilityProofs(robotIds: readonly string[], capabilities: readonly string[]): Promise<CapabilityProofRow[]>;
  listPublicChanges(limit?: number): Promise<PublicChangeRow[]>;
  listChangeHistory(filter: ChangeHistoryFilter): Promise<{ rows: ChangeHistoryRow[]; total: number }>;
  listFactObservations(robotId: string, predicate?: string): Promise<FactObservationRow[]>;
  /** Published repositories whose name or description contains `query` (all of them for an empty query). */
  listRepositories(query: string): Promise<RepositoryRow[]>;
  /** What a presented pro key grants, or null for an unknown or revoked key. */
  lookupApiKey(key: string): Promise<ApiKeyGrant | null>;
  close(): Promise<void>;
}
