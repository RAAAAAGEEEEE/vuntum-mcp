
/** The minimal view of an accepted fact these rules need. */
export interface ProgrammingFactInput {
  readonly predicate: string;
  /** `value.value` for tristate, enum and text values. */
  readonly simpleValue?: string | undefined;
}

/**
 * A robot is "programmable" when an accepted fact says one of these, or when
 * an official repository of its maker is linked to it (checked in SQL, view
 * `public_robot_programmability`, migration 0043: keep both lists in step).
 */
export const PROGRAMMABLE_CRITERIA: ReadonlyArray<{
  readonly predicate: string;
  /** Accepted values; `null` = any non-empty text. */
  readonly values: readonly string[] | null;
}> = [
  { predicate: 'software.sdk_public', values: ['yes'] },
  { predicate: 'software.python', values: ['yes'] },
  { predicate: 'software.cpp', values: ['yes'] },
  { predicate: 'software.ros', values: ['ros1', 'ros2', 'both'] },
  { predicate: 'software.mcp', values: ['yes'] },
  { predicate: 'software.visual_programming', values: ['yes'] },
  { predicate: 'software.home_assistant', values: ['yes'] },
  { predicate: 'software.llm_control', values: ['yes'] },
  { predicate: 'software.alt_firmware', values: null },
];

export type ProgrammingLevel = 'beginner' | 'intermediate' | 'advanced';

export const PROGRAMMING_LEVEL_LABELS: Readonly<Record<ProgrammingLevel, { fr: string; en: string }>> = {
  beginner: { fr: 'Débutant', en: 'Beginner' },
  intermediate: { fr: 'Intermédiaire', en: 'Intermediate' },
  advanced: { fr: 'Avancé', en: 'Advanced' },
};

/**
 * Which documented way of programming the robot opens which level. The
 * level shown is the lowest one reachable: "you can start here". Published
 * as is on the methodology page.
 */
export const PROGRAMMING_LEVEL_RULES: ReadonlyArray<{
  readonly level: ProgrammingLevel;
  readonly predicate: string;
  readonly values: readonly string[] | null;
  readonly reasonFr: string;
}> = [
  { level: 'beginner', predicate: 'software.visual_programming', values: ['yes'], reasonFr: 'programmation par blocs' },
  { level: 'beginner', predicate: 'software.llm_control', values: ['yes'], reasonFr: 'consignes en langage naturel' },
  { level: 'intermediate', predicate: 'software.python', values: ['yes'], reasonFr: 'SDK Python' },
  { level: 'intermediate', predicate: 'software.home_assistant', values: ['yes'], reasonFr: 'automatisations Home Assistant' },
  { level: 'intermediate', predicate: 'software.mcp', values: ['yes'], reasonFr: 'serveur MCP' },
  { level: 'advanced', predicate: 'software.cpp', values: ['yes'], reasonFr: 'SDK C++' },
  { level: 'advanced', predicate: 'software.ros', values: ['ros1', 'ros2', 'both'], reasonFr: 'ROS' },
  { level: 'advanced', predicate: 'software.sdk_public', values: ['yes'], reasonFr: 'SDK public' },
  { level: 'advanced', predicate: 'software.alt_firmware', values: null, reasonFr: 'micrologiciel alternatif à installer' },
];

const LEVEL_ORDER: readonly ProgrammingLevel[] = ['beginner', 'intermediate', 'advanced'];

export interface ProgrammingLevelResult {
  /** Lowest level reachable, or null when no fact says how to program it. */
  readonly entry: ProgrammingLevel | null;
  /** Every level reachable, with what opens it, easiest first. */
  readonly paths: ReadonlyArray<{ level: ProgrammingLevel; reasonsFr: string[] }>;
}

export function programmingLevel(facts: readonly ProgrammingFactInput[]): ProgrammingLevelResult {
  const byLevel = new Map<ProgrammingLevel, string[]>();
  for (const rule of PROGRAMMING_LEVEL_RULES) {
    const matched = facts.some((f) => {
      if (f.predicate !== rule.predicate || f.simpleValue === undefined) return false;
      return rule.values === null ? f.simpleValue.trim().length > 0 : rule.values.includes(f.simpleValue);
    });
    if (!matched) continue;
    const reasons = byLevel.get(rule.level) ?? [];
    if (!reasons.includes(rule.reasonFr)) reasons.push(rule.reasonFr);
    byLevel.set(rule.level, reasons);
  }
  // A public SDK alone says nothing new once a language is known.
  const advanced = byLevel.get('advanced');
  if (advanced && advanced.length > 1) {
    byLevel.set('advanced', advanced.filter((r) => r !== 'SDK public'));
  }
  const paths = LEVEL_ORDER.filter((l) => byLevel.has(l)).map((level) => ({
    level,
    reasonsFr: byLevel.get(level) ?? [],
  }));
  return { entry: paths[0]?.level ?? null, paths };
}
