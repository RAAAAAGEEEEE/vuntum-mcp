import { isDefenceSegment } from '../defence.js';

/**
 * What a sheet or a list entry of a `defense` robot never carries (military
 * rules, ADR-078): no promotion, no promotional badge, no « best for »
 * ranking, no affiliate or purchase link, no merchant price or offer. One
 * pure function says it, the pages and the lists read it, so no component
 * decides on its own.
 */
export interface DefenceSheetRestrictions {
  /** May appear in « robots du moment », the front page, any promotion. */
  readonly promotable: boolean;
  /** May enter a « best for » ranking. */
  readonly rankable: boolean;
  /** « Où l'acheter », affiliate link, accessory shop links. */
  readonly showPurchase: boolean;
  /** Merchant prices, price history, France offer, schema.org offers. */
  readonly showPrices: boolean;
  /** Promotional badges (commercial availability, pre-order). */
  readonly showPromotionalBadges: boolean;
  /** The embeddable « verified sheet » badge other sites can display. */
  readonly showEmbedBadge: boolean;
}

export function defenceSheetRestrictions(segment: string | null | undefined): DefenceSheetRestrictions {
  const open = !isDefenceSegment(segment);
  return {
    promotable: open,
    rankable: open,
    showPurchase: open,
    showPrices: open,
    showPromotionalBadges: open,
    showEmbedBadge: open,
  };
}

/** Badges that sell: commercial availability and pre-order. */
export const PROMOTIONAL_BADGES: ReadonlySet<string> = new Set(['preorder', 'available_eu']);

/** The badges a robot of this segment may show. */
export function badgesForSegment(badges: readonly string[], segment: string | null | undefined): string[] {
  if (defenceSheetRestrictions(segment).showPromotionalBadges) return [...badges];
  return badges.filter((badge) => !PROMOTIONAL_BADGES.has(badge));
}

/** A listed price, hidden for a defence robot. */
export function priceForSegment(price: string | null, segment: string | null | undefined): string | null {
  return defenceSheetRestrictions(segment).showPrices ? price : null;
}
