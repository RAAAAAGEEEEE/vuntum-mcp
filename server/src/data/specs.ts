import { valuesAgree, type ClaimValue, type Qualifiers } from '../domain/claim-value.js';
import { variantKey } from '../domain/variants.js';

/**
 * One retained value per robot, criterion, version and market (audit of
 * 01/10/2026, ADR-029, migration 0053). Rules only, no model:
 *
 *  - the claims read: accepted, active, not sample, from a source that is not
 *    a sample;
 *  - grouped by version (`variantKey` of `qualifiers.variant`: only an explicit
 *    qualifier makes a version), criterion and market;
 *  - inside a group, the claims whose values agree (`valuesAgree`, the
 *    criterion's tolerance) are one value with all their sources; the value
 *    kept for display is the one an official source gives, else the one most
 *    sources give, else the latest;
 *  - values that really differ inside one group are never merged: the row is
 *    `several` and lists them, retained value NULL.
 *
 * The versions named by the qualifiers get a `robot_variant` row and their
 * claims point to it (`claim.robot_variant_id`).
 */

export interface SpecClaimRow {
  id: string;
  predicate: string;
  value: ClaimValue;
  qualifiers: Qualifiers;
  source_id: string;
  source_is_official: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  robot_variant_id: string | null;
}

export interface SpecValue {
  readonly value: ClaimValue;
  readonly claimIds: string[];
  readonly sourceIds: string[];
  readonly official: boolean;
  readonly qualifiers: Qualifiers;
  readonly latest: number;
}

export interface SpecGroup {
  readonly variantKey: string;
  readonly variantLabel: string | null;
  readonly predicate: string;
  readonly market: string;
  readonly status: 'single' | 'several';
  readonly values: SpecValue[];
}

const time = (t: string | Date) => new Date(t).getTime();

/** Groups and clusters a robot's accepted claims; pure, so the rule is tested without a database. */
export function buildSpecGroups(claims: readonly SpecClaimRow[], names: readonly string[]): SpecGroup[] {
  const groups = new Map<string, { variantKey: string; labels: string[]; predicate: string; market: string; claims: SpecClaimRow[] }>();
  for (const claim of claims) {
    const key = variantKey(claim.qualifiers?.variant, names) ?? '';
    const market = claim.qualifiers?.market ?? '';
    const id = `${key}|${claim.predicate}|${market}`;
    const group = groups.get(id) ?? { variantKey: key, labels: [], predicate: claim.predicate, market, claims: [] };
    group.claims.push(claim);
    if (key && claim.qualifiers?.variant) group.labels.push(claim.qualifiers.variant);
    groups.set(id, group);
  }
  const out: SpecGroup[] = [];
  for (const group of groups.values()) {
    const clusters: Array<{ claims: SpecClaimRow[] }> = [];
    const ordered = [...group.claims].sort((a, b) => time(a.created_at) - time(b.created_at) || (a.id < b.id ? -1 : 1));
    for (const claim of ordered) {
      const home = clusters.find((c) => c.claims.every((o) => valuesAgree(group.predicate, o.value, claim.value) === true));
      if (home) home.claims.push(claim);
      else clusters.push({ claims: [claim] });
    }
    const values: SpecValue[] = clusters.map(({ claims: members }) => {
      const official = members.filter((m) => m.source_is_official);
      const pool = official.length > 0 ? official : members;
      const shown = [...pool].sort((a, b) => time(b.created_at) - time(a.created_at))[0] as SpecClaimRow;
      return {
        value: shown.value,
        qualifiers: shown.qualifiers ?? {},
        claimIds: members.map((m) => m.id).sort(),
        sourceIds: [...new Set(members.map((m) => m.source_id))].sort(),
        official: official.length > 0,
        latest: Math.max(...members.map((m) => time(m.created_at))),
      };
    });
    values.sort(
      (a, b) =>
        Number(b.official) - Number(a.official) || b.sourceIds.length - a.sourceIds.length || b.latest - a.latest,
    );
    const label = mostFrequent(group.labels);
    out.push({
      variantKey: group.variantKey,
      variantLabel: label,
      predicate: group.predicate,
      market: group.market,
      status: values.length === 1 ? 'single' : 'several',
      values,
    });
  }
  return out.sort((a, b) => `${a.variantKey}|${a.predicate}|${a.market}`.localeCompare(`${b.variantKey}|${b.predicate}|${b.market}`));
}

function mostFrequent(labels: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  // The most used spelling; on a tie the fuller one (« G1 EDU » rather than « EDU »).
  return [...counts].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]?.[0] ?? null;
}
