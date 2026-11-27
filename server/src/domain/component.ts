
/**
 * The component registry: companies that make a part of a
 * robot (motor, sensor, hand, chip, battery, gearbox), each tied to the robots
 * that use it by a link read on an official page. Grouping and wording are
 * computed here so the page, the sitemap and the tests agree.
 */

export const componentTypes = ['motor', 'gearbox', 'sensor', 'hand', 'chip', 'battery'] as const;
export type ComponentType = (typeof componentTypes)[number];

/**
 * The note of a part in the language of the page: the French note is the
 * page's own wording, the English one is its translation. A page that is not French
 * never shows the French note, so a part without an English note shows none.
 */
export function componentDetailFor(
  row: { readonly detail: string | null; readonly detailEn: string | null },
  locale: string,
): string | null {
  return locale === 'fr' ? row.detail : row.detailEn;
}

export const MIN_COMPONENT_LINKS_PUBLIC = 12;
export const MIN_COMPONENT_COMPANIES_PUBLIC = 5;

/** The page exists from enough sourced links on enough distinct companies. */
export function componentsPageExists(links: number, companies: number): boolean {
  return links >= MIN_COMPONENT_LINKS_PUBLIC && companies >= MIN_COMPONENT_COMPANIES_PUBLIC;
}
