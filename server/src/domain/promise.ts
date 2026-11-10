
/**
 * The promises of the makers: a release date, a delivery,
 * a volume or a price announced in public, quoted word for word with its
 * source, its date and its deadline. The status is computed here, by code,
 * from the deadline, the day and the public facts of the robot: it is never
 * stored and never written by a model.
 */

export const promiseKinds = ['release', 'delivery', 'volume', 'price'] as const;
export type PromiseKind = (typeof promiseKinds)[number];

export type PromiseStatusKey = 'open' | 'overdue' | 'kept' | 'missed';

export interface PromiseStatus {
  readonly key: PromiseStatusKey;
  /** Days past the deadline: the delay of an overdue promise, or of a kept one that came late. */
  readonly daysLate: number;
  /** Days left before the deadline (open promise), else 0. */
  readonly daysLeft: number;
}

export interface PromiseStatusInput {
  /** Deadline, `YYYY-MM-DD`: the latest day the maker's words allow. */
  readonly dueOn: string;
  readonly kind: PromiseKind;
  /** When a public, accepted fact first says the robot is on sale (source date), else null. */
  readonly availableSince: string | null;
  /** True when a public, accepted fact says the maker withdrew the robot. */
  readonly discontinued: boolean;
}

const DAY_MS = 86_400_000;

function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / DAY_MS);
}

/**
 * Status of a promise on a given day (`today`, `YYYY-MM-DD`).
 *
 * - `kept`: a release or a delivery, and a dated public fact says the robot
 *   is on sale; `daysLate` is how long after the deadline (0 when on time).
 *   A price or a volume is never marked kept: the facts that would settle it
 *   are not read, so it stays open or overdue rather than guessed.
 * - `missed`: the maker withdrew the robot before it delivered.
 * - `overdue`: the deadline passed and nothing settles it: `daysLate` days.
 * - `open`: the deadline is today or later.
 */
export function promiseStatus(input: PromiseStatusInput, today: string): PromiseStatus {
  const due = dayNumber(input.dueOn);
  const now = dayNumber(today);
  const late = Math.max(0, now - due);
  const settlesByAvailability = input.kind === 'release' || input.kind === 'delivery';
  if (settlesByAvailability && input.availableSince) {
    return { key: 'kept', daysLate: Math.max(0, dayNumber(input.availableSince) - due), daysLeft: 0 };
  }
  if (input.discontinued && now > due) return { key: 'missed', daysLate: late, daysLeft: 0 };
  if (now > due) return { key: 'overdue', daysLate: late, daysLeft: 0 };
  return { key: 'open', daysLate: 0, daysLeft: due - now };
}
