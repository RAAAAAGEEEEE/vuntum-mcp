/** `robot.segment` of robots designed for armed or state security forces. */
export const DEFENCE_SEGMENT = 'defense';

export function isDefenceSegment(segment: string | null | undefined): boolean {
  return segment === DEFENCE_SEGMENT;
}
