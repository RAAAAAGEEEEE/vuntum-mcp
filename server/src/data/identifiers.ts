import type { SqlClient } from './sql-client.js';

/** Product identifiers of the robot sheets: ASIN per marketplace, GTIN, manufacturer part number. */

export const IDENTIFIER_KINDS = ['asin', 'gtin', 'mpn'] as const;
export type IdentifierKind = (typeof IDENTIFIER_KINDS)[number];

/** Marketplaces stored in `robot_identifier`; the amazon.fr ASIN lives in `robot_retail_link`. */
export const ASIN_MARKETPLACES = ['amazon_com', 'amazon_de', 'amazon_co_uk', 'amazon_es', 'amazon_it'] as const;

/** Every marketplace an ASIN can be shown for (amazon.fr included). */
export const ALL_ASIN_MARKETPLACES = ['amazon_fr', ...ASIN_MARKETPLACES] as const;

/** Host of a marketplace, for display and for the evidence address. */
export const MARKETPLACE_HOST: Record<string, string> = {
  amazon_fr: 'amazon.fr',
  amazon_com: 'amazon.com',
  amazon_de: 'amazon.de',
  amazon_co_uk: 'amazon.co.uk',
  amazon_es: 'amazon.es',
  amazon_it: 'amazon.it',
};

export interface RobotIdentifier {
  kind: IdentifierKind;
  /** `amazon_*` for an ASIN, `manufacturer` for a GTIN or a part number. */
  marketplace: string;
  /** Commercial version the code belongs to; empty when it is the robot as a whole. */
  variant: string;
  value: string;
  verifiedAt: string;
}

interface IdentifierRow {
  kind: IdentifierKind;
  marketplace: string;
  variant: string;
  value: string;
  verified_at: Date | string;
}

const KIND_ORDER: Record<IdentifierKind, number> = { gtin: 0, mpn: 1, asin: 2 };

function sortIdentifiers(items: RobotIdentifier[]): RobotIdentifier[] {
  const market = (m: string): number => {
    const index = (ALL_ASIN_MARKETPLACES as readonly string[]).indexOf(m);
    return index < 0 ? 0 : index;
  };
  return items.sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.variant.localeCompare(b.variant) ||
      market(a.marketplace) - market(b.marketplace),
  );
}

function toIdentifier(row: IdentifierRow): RobotIdentifier {
  return {
    kind: row.kind,
    marketplace: row.marketplace,
    variant: row.variant,
    value: row.value,
    verifiedAt: new Date(row.verified_at).toISOString(),
  };
}

/** The identifiers shown for a published robot (none for a draft or a sample); a failed read is the caller's to catch. */
export async function listRobotIdentifiers(client: SqlClient, robotId: string): Promise<RobotIdentifier[]> {
  const rows = await client.query<IdentifierRow>(
    `SELECT kind, marketplace, variant, value, verified_at FROM public_robot_identifier WHERE robot_id = $1`,
    [robotId],
  );
  return sortIdentifiers(rows.map(toIdentifier));
}

/** An identifier as the API and the MCP give it: the marketplace by its host, no internal key. */
export interface PublicIdentifier {
  kind: IdentifierKind;
  /** `amazon.fr`, `amazon.com`, ... for an ASIN; `manufacturer` for a GTIN or a part number. */
  marketplace: string;
  value: string;
  /** Commercial version the code belongs to; null when it is the robot as a whole. */
  variant: string | null;
  /** Day the code was last checked against its page (`AAAA-MM-JJ`). */
  verifiedOn: string;
}

export function toPublicIdentifiers(list: readonly RobotIdentifier[]): PublicIdentifier[] {
  return list.map((i) => ({
    kind: i.kind,
    marketplace: MARKETPLACE_HOST[i.marketplace] ?? i.marketplace,
    value: i.value,
    variant: i.variant === '' ? null : i.variant,
    verifiedOn: i.verifiedAt.slice(0, 10),
  }));
}
