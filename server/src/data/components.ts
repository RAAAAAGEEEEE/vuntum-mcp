import type { ComponentType } from '../domain/component.js';
import type { SqlClient } from './sql-client.js';

/**
 * The components of one robot: the links of
 * `public_component_link` whose official page still carries the wording.
 * Shared by the robot sheet, the public API and the MCP tools, so the three
 * show the same links.
 */

export interface RobotComponent {
  readonly companySlug: string;
  readonly companyName: string;
  readonly companyUrl: string;
  readonly component: ComponentType;
  /** What the page says the part is, in the page's words. */
  readonly detail: string | null;
  /** The English translation of the note, empty while it is not written. */
  readonly detailEn: string | null;
  /** The official page that names the company for this robot. */
  readonly url: string;
  readonly host: string;
}

interface Row {
  company_slug: string;
  company_name: string;
  company_url: string;
  component: ComponentType;
  detail: string | null;
  detail_en: string | null;
  url: string;
}

const ORDER = ['motor', 'gearbox', 'sensor', 'hand', 'chip', 'battery'];

export async function listComponentsForRobot(client: SqlClient, robotSlug: string): Promise<RobotComponent[]> {
  const rows = await client.query<Row>(
    `SELECT company_slug, company_name, company_url, component, detail, detail_en, url
       FROM public_component_link
      WHERE robot_slug = $1
      ORDER BY company_name, url`,
    [robotSlug],
  );
  return rows
    .map((r) => ({
      companySlug: r.company_slug,
      companyName: r.company_name,
      companyUrl: r.company_url,
      component: r.component,
      detail: r.detail,
      detailEn: r.detail_en,
      url: r.url,
      host: new URL(r.url).hostname.replace(/^www\./, ''),
    }))
    .sort((a, b) => ORDER.indexOf(a.component) - ORDER.indexOf(b.component));
}
