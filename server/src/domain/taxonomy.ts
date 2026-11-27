/**
 * What a household robot does, one value per sheet (`public_robot.home_task`). Only the identifiers the
 * catalogue snapshot reads: the labels stay on the site.
 */
export const homeTasks = ['floor_cleaning', 'lawn_mowing', 'pool_cleaning', 'window_cleaning', 'other'] as const;
export type HomeTask = (typeof homeTasks)[number];

export function isHomeTask(value: unknown): value is HomeTask {
  return typeof value === 'string' && (homeTasks as readonly string[]).includes(value);
}
