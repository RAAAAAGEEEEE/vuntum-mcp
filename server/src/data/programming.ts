import { PROGRAMMING_LEVEL_LABELS, programmingLevel, type ProgrammingFactInput, type ProgrammingLevel } from '../domain/programming.js';
import type { Locale } from '../domain/enums.js';
import type { SqlClient } from './sql-client.js';

// ------------------------------------------------------------ robotics rule

/**
 * Words that make a community repository a robotics one. The worker admits a
 * community repository when it names the robot, and a robot called "Astro"
 * then pulled in the Astro web framework and a programming-snippets site
 *. Read side, an unofficial repository is shown only when its name,
 * description or topics carry one of these words. Official repositories (the
 * maker's own organisation) are always shown.
 */
const ROBOTICS_PATTERN =
  // "robot" anywhere (robotics, LejuRobotics, robotique); maker and model
  // names as a word start; short words only as whole words. Written in the
  // subset shared by JavaScript and PostgreSQL regular expressions, so the
  // same rule runs in code and in SQL.
  'robot|(?:^|[^a-z0-9])(?:(?:unitree|turtlebot|xarm|ridgeback|reachy|roomba|navimow)|' +
  '(?:ros2?|humanoids?|quadrupeds?|manipulat(?:or|ion)s?|mujoco|gazebo|urdf|mjcf|isaac|slam|lidar|' +
  'teleop(?:eration)?|locomotion|gripper|embodied|lerobot|drones?|uavs?|sim2real|actuators?|exoskeletons?)' +
  '(?:[^a-z0-9]|$))';
const ROBOTICS_WORDS = new RegExp(ROBOTICS_PATTERN);

export function isRoboticsRepository(repo: {
  full_name: string;
  description_original?: string | null;
  topics?: readonly string[] | null;
  is_official?: boolean;
}): boolean {
  if (repo.is_official) return true;
  const text = [repo.full_name, repo.description_original ?? '', ...(repo.topics ?? [])]
    .join(' ')
    .toLowerCase();
  return ROBOTICS_WORDS.test(text);
}

export interface ProgrammableRobotRow {
  robot_id: string;
  slug: string;
  name_usual: string;
  manufacturer_name: string;
  category_slug: string | null;
  segment: string | null;
  sdk_public: boolean | null;
  python: boolean | null;
  cpp: boolean | null;
  ros2: boolean | null;
  ros: boolean | null;
  mcp: boolean | null;
  visual_programming: boolean | null;
  home_assistant: boolean | null;
  llm_control: boolean | null;
  alt_firmware: boolean | null;
  local_control: boolean | null;
  cloud_required: boolean | null;
  simulation: boolean | null;
  official_repositories: number | string;
  community_repositories: number | string;
  top_stars: number | string;
  last_push: string | null;
  ros_released: boolean;
  is_programmable: boolean;
}

export interface ProgrammableFilters {
  /** Only robots with an accepted fact on this way of programming. */
  readonly with?: ReadonlyArray<
    'python' | 'cpp' | 'ros2' | 'mcp' | 'visual_programming' | 'home_assistant' | 'llm_control' | 'alt_firmware' | 'simulation' | 'local_control'
  >;
  /** Robots whose documented entry level is at most this one. */
  readonly maxLevel?: ProgrammingLevel;
  readonly segment?: string;
  readonly limit?: number;
  /** Language of `ways` and `levelLabel` (French by default). */
  readonly locale?: Locale;
}

export interface ProgrammableRobotView {
  readonly slug: string;
  readonly name: string;
  readonly manufacturer: string;
  readonly category: string | null;
  readonly segment: string | null;
  readonly ways: string[];
  readonly level: ProgrammingLevel | null;
  readonly levelLabel: string | null;
  readonly officialRepositories: number;
  readonly communityRepositories: number;
  readonly topStars: number;
  readonly rosReleased: boolean;
  readonly cloudRequired: boolean | null;
}

const WAY_LABELS: ReadonlyArray<[keyof ProgrammableRobotRow, string, string]> = [
  ['visual_programming', 'Blocs', 'Blocks'],
  ['llm_control', 'Langage naturel', 'Natural language'],
  ['python', 'Python', 'Python'],
  ['cpp', 'C++', 'C++'],
  ['ros2', 'ROS 2', 'ROS 2'],
  ['mcp', 'MCP', 'MCP'],
  ['home_assistant', 'Home Assistant', 'Home Assistant'],
  ['alt_firmware', 'Micrologiciel libre', 'Open firmware'],
  ['simulation', 'Simulation', 'Simulation'],
];

/**
 * The rubric's directory: robots meeting the "programmable" rule, the best
 * documented first (official code, then community code, then facts).
 */
export async function listProgrammableRobots(
  client: SqlClient,
  filters: ProgrammableFilters = {},
): Promise<ProgrammableRobotView[]> {
  const conditions = ['p.is_programmable'];
  const params: unknown[] = [];
  for (const way of filters.with ?? []) {
    // Column names come from a closed list, never from the caller's text.
    if (!WAY_LABELS.some(([k]) => k === way) && way !== 'local_control') continue;
    conditions.push(`COALESCE(p.${way}, FALSE)`);
  }
  if (filters.segment) {
    params.push(filters.segment);
    conditions.push(`r.segment = $${params.length}`);
  }
  params.push(Math.min(filters.limit ?? 100, 200));
  const rows = await client.query<ProgrammableRobotRow>(
    `SELECT p.*, r.name_usual, r.manufacturer_name, r.category_slug, r.segment
       FROM public_robot_programmability p
       JOIN public_robot r ON r.id = p.robot_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.official_repositories DESC, p.top_stars DESC, p.programming_facts DESC, r.name_usual
      LIMIT $${params.length}`,
    params,
  );

  const out: ProgrammableRobotView[] = [];
  for (const row of rows) {
    const locale = filters.locale ?? 'fr';
    const ways = WAY_LABELS.filter(([k]) => row[k] === true).map(([, fr, en]) => (locale === 'en' ? en : fr));
    const inputs: ProgrammingFactInput[] = (
      [
        ['software.visual_programming', row.visual_programming],
        ['software.llm_control', row.llm_control],
        ['software.python', row.python],
        ['software.home_assistant', row.home_assistant],
        ['software.mcp', row.mcp],
        ['software.cpp', row.cpp],
        ['software.sdk_public', row.sdk_public],
      ] as const
    )
      .filter(([, on]) => on === true)
      .map(([predicate]): ProgrammingFactInput => ({ predicate, simpleValue: 'yes' }));
    if (row.ros2) inputs.push({ predicate: 'software.ros', simpleValue: 'ros2' });
    else if (row.ros) inputs.push({ predicate: 'software.ros', simpleValue: 'ros1' });
    if (row.alt_firmware) inputs.push({ predicate: 'software.alt_firmware', simpleValue: 'oui' });
    const level = programmingLevel(inputs).entry;
    if (filters.maxLevel) {
      const order: ProgrammingLevel[] = ['beginner', 'intermediate', 'advanced'];
      if (level === null || order.indexOf(level) > order.indexOf(filters.maxLevel)) continue;
    }
    out.push({
      slug: row.slug,
      name: row.name_usual,
      manufacturer: row.manufacturer_name,
      category: row.category_slug,
      segment: row.segment,
      ways,
      level,
      levelLabel: level ? PROGRAMMING_LEVEL_LABELS[level][locale] : null,
      officialRepositories: Number(row.official_repositories),
      communityRepositories: Number(row.community_repositories),
      topStars: Number(row.top_stars),
      rosReleased: row.ros_released,
      cloudRequired: row.cloud_required,
    });
  }
  return out;
}
