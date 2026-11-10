/**
 * Versions of a robot, as the sources name them in `qualifiers.variant`
 * (audit of 01/10/2026: « G1 EDU », « EDU » and « Unitree G1 EDU » are one
 * version; « Unitree G1 » alone is the robot itself).
 */

function tokens(text: string): string[] {
  return text
    .normalize('NFKC')
    .replace(/[™®©]/g, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}+]+/u)
    .filter(Boolean);
}

/**
 * The key of the version a qualifier names, or null when it names the robot
 * itself: the words of the robot's and its maker's names are taken off the
 * front, what remains is the version (« EDU », « Pro », « 5 »). Only an
 * explicit qualifier makes a version; nothing is inferred from conditions.
 */
export function variantKey(
  variant: string | null | undefined,
  names: readonly string[],
): string | null {
  if (!variant) return null;
  const words = tokens(variant);
  const own = new Set(names.flatMap((n) => tokens(n)));
  let start = 0;
  while (start < words.length && own.has(words[start] as string)) start++;
  const rest = words.slice(start);
  return rest.length > 0 ? rest.join(' ') : null;
}
