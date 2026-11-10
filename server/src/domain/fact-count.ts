/**
 * Number of distinct facts on a robot: one per characteristic and market. A
 * robot sold in several sizes carries one row per size (and per way the page
 * wrote the size), so counting rows gives 22 « facts » for 6 characteristics
 * (Segway Navimow, task 445). The raw row count stays for the indexing rule;
 * every number shown to a reader uses this one.
 */
export function distinctFactCount(
  facts: readonly { readonly predicate: string; readonly qualifiers?: Readonly<Record<string, unknown>> | null }[],
): number {
  const seen = new Set<string>();
  for (const fact of facts) {
    const market = fact.qualifiers?.['market'];
    seen.add(`${fact.predicate}|${typeof market === 'string' ? market : ''}`);
  }
  return seen.size;
}
