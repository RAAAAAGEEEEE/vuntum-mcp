import type { EventKind } from '../domain/event.js';
import type { FigureKind, FigureQualifier } from '../domain/figures.js';
import type { SqlClient } from './sql-client.js';

/**
 * The registers behind the calendar, corrections, competition, company, integrator, supplier, guide,
 * author, glossary and release tools: one parameterised SELECT each, on a `public_*` table (see
 * `sql/schema.sql`). The tools filter and shape the rows; nothing here writes.
 */

export interface EventRow {
  slug: string;
  name: string;
  kind: EventKind;
  starts_on: string | Date;
  ends_on: string | Date;
  city: string | null;
  country_fr: string | null;
  country_en: string | null;
  online: boolean;
  url: string;
  description_fr: string;
  description_en: string;
  confirmed_at: string | Date;
}

export interface CorrectionRow {
  id: string;
  subject_type: string;
  summary_fr: string;
  detail_fr: string | null;
  summary_en: string | null;
  detail_en: string | null;
  corrected_at: string | Date;
}

export interface ResultRowDb {
  id: string;
  competition_slug: string;
  competition_name: string;
  edition_year: number;
  place_fr: string;
  place_en: string;
  discipline_fr: string;
  discipline_en: string;
  rank: number;
  team: string;
  institution: string | null;
  robot: string | null;
  detail_fr: string | null;
  detail_en: string | null;
  autonomy: string;
  autonomy_text: string | null;
  autonomy_url: string | null;
  url: string;
  confirmed_at: string | Date;
}

export interface FigureRow {
  id: string;
  company_name: string;
  manufacturer_slug: string | null;
  kind: FigureKind;
  amount: string | number | null;
  currency: string | null;
  headcount: number | null;
  qualifier: FigureQualifier | null;
  stage: string | null;
  as_of: string | Date;
  note_fr: string | null;
  note_en: string | null;
  url: string;
}

export interface IntegratorRow {
  integrator_slug: string;
  integrator_name: string;
  country_code: string;
  website_url: string | null;
  manufacturer_slug: string;
  program: string;
  author: 'manufacturer' | 'integrator';
  quote: string;
  url: string;
  published_on: string | Date;
  confirmed_at: string | Date;
}

export interface ComponentLinkDb {
  company_slug: string;
  company_name: string;
  company_url: string;
  component: string;
  detail: string | null;
  detail_en: string | null;
  robot_slug: string;
  robot_name: string;
  manufacturer_name: string;
  url: string;
  country_code: string | null;
  ownership: string | null;
  confirmed_at: string | Date;
}

export interface GuideRow {
  slug: string;
  title: string;
  standfirst: string | null;
  published_at: string | Date;
}

export interface AuthorRow {
  slug: string;
  name: string;
  bio_fr: string | null;
  bio_en: string | null;
}

export interface GlossaryRow {
  slug: string;
  term: string;
  other_term: string | null;
  abbreviation: string | null;
  definition: string;
  related: string[] | null;
  /** [{"label": "...", "url": "..."}, ...] */
  references: unknown;
  verified_on: string | Date | null;
  noindex: boolean;
}

export interface ReleaseRobotRow {
  id: string;
  slug: string;
  name: string;
  maker: string | null;
  commercial_status: string;
}

export interface ReleaseFactRow {
  robot_id: string;
  predicate: string;
  value: { kind?: string; value?: string; precision?: string; originalText?: string } | null;
  last_verified_at: string | Date;
  source_url: string;
}

export const listEvents = (client: SqlClient): Promise<EventRow[]> =>
  client.query<EventRow>(
    `SELECT slug, name, kind, starts_on, ends_on, city, country_fr, country_en, online, url,
            description_fr, description_en, confirmed_at
       FROM public_event`,
  );

export const listCorrections = (client: SqlClient): Promise<CorrectionRow[]> =>
  client.query<CorrectionRow>(
    `SELECT id, subject_type, summary_fr, detail_fr, summary_en, detail_en, corrected_at
       FROM public_correction ORDER BY corrected_at DESC LIMIT 100`,
  );

export const listCompetitionResults = (client: SqlClient): Promise<ResultRowDb[]> =>
  client.query<ResultRowDb>(
    `SELECT id, competition_slug, competition_name, edition_year, place_fr, place_en, discipline_fr, discipline_en,
            rank, team, institution, robot, detail_fr, detail_en, autonomy, autonomy_text, autonomy_url, url, confirmed_at
       FROM public_competition_result
      ORDER BY edition_year DESC, competition_slug, id`,
  );

export const listCompanyFigures = (client: SqlClient): Promise<FigureRow[]> =>
  client.query<FigureRow>(
    `SELECT id, company_name, manufacturer_slug, kind, amount, currency, headcount, qualifier, stage,
            as_of, note_fr, note_en, url
       FROM public_company_figure
      ORDER BY as_of DESC, id`,
  );

export const listIntegratorPartnerships = (client: SqlClient): Promise<IntegratorRow[]> =>
  client.query<IntegratorRow>(
    `SELECT integrator_slug, integrator_name, country_code, website_url, manufacturer_slug, program, author,
            quote, url, published_on, confirmed_at
       FROM public_integrator_partnership
      ORDER BY integrator_name, manufacturer_slug, published_on, id`,
  );

export const listComponentLinks = (client: SqlClient): Promise<ComponentLinkDb[]> =>
  client.query<ComponentLinkDb>(
    `SELECT company_slug, company_name, company_url, component, detail, detail_en, robot_slug, robot_name,
            manufacturer_name, url, country_code, ownership, confirmed_at
       FROM public_component_link
      ORDER BY company_name, component, robot_name`,
  );

export const listGuides = (client: SqlClient, locale: 'fr' | 'en'): Promise<GuideRow[]> =>
  client.query<GuideRow>(
    `SELECT slug, title, standfirst, published_at FROM public_article
      WHERE locale = $1 AND kind = 'guide' ORDER BY published_at DESC LIMIT 50`,
    [locale],
  );

export const listAuthors = (client: SqlClient): Promise<AuthorRow[]> =>
  client.query<AuthorRow>('SELECT slug, name, bio_fr, bio_en FROM public_author ORDER BY name');

export const listGlossary = (client: SqlClient, locale: 'fr' | 'en'): Promise<GlossaryRow[]> =>
  client.query<GlossaryRow>(
    `SELECT slug, term, other_term, abbreviation, definition, related, "references", verified_on, noindex
       FROM public_glossary_entry WHERE locale = $1 ORDER BY term`,
    [locale],
  );

export const listReleaseRobots = (client: SqlClient): Promise<ReleaseRobotRow[]> =>
  client.query<ReleaseRobotRow>(
    `SELECT id, slug, COALESCE(name_usual, slug) AS name, manufacturer_name AS maker, commercial_status FROM public_robot`,
  );

export const listReleaseFacts = (client: SqlClient): Promise<ReleaseFactRow[]> =>
  client.query<ReleaseFactRow>(
    `SELECT robot_id, predicate, value, last_verified_at, source_url FROM public_fact
      WHERE predicate IN ('availability.first_shipping_date', 'availability.state', 'price.preorder_deposit')`,
  );
