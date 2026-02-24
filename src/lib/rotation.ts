import {
  startOfDay,
  nextSaturday,
  isSaturday,
  differenceInWeeks,
  addWeeks,
} from "date-fns";

export type RotationUser = {
  id: string;
  name: string;
  phone: string;
  order: number;
};

/**
 * Returns the Saturday of the weekend that contains or immediately follows `date`.
 * Saturday is the canonical "start" of a duty weekend.
 */
export function getWeekSaturday(date: Date): Date {
  const d = startOfDay(date);
  return isSaturday(d) ? d : nextSaturday(d);
}

/**
 * Pure mathematical rotation resolver — no DB access.
 *
 * Algorithm:
 *   weekIndex      = differenceInWeeks(targetSaturday, seedSaturday)
 *   userOrderIndex = ((seedUserOrder + weekIndex) % n + n) % n
 *
 * @param targetDate    Any date; resolves to the containing weekend's Saturday
 * @param seedDate      The Saturday anchor from RotationConfig
 * @param seedUserOrder The User.order value on duty at seedDate
 * @param users         All users sorted by order ASC
 */
export function resolveUserForWeekend(
  targetDate: Date,
  seedDate: Date,
  seedUserOrder: number,
  users: RotationUser[]
): RotationUser {
  const targetSaturday = getWeekSaturday(targetDate);
  const seedSaturday = startOfDay(seedDate);

  const weekIndex = differenceInWeeks(targetSaturday, seedSaturday);
  const n = users.length;
  const rawIndex = (seedUserOrder + weekIndex) % n;
  const userOrderIndex = ((rawIndex % n) + n) % n;

  const user = users.find((u) => u.order === userOrderIndex);
  if (!user) throw new Error(`No user found for order index ${userOrderIndex}`);
  return user;
}

/**
 * Returns `count` weekends starting from (and including) `fromDate`'s weekend.
 * Does NOT resolve overrides — that is the caller's responsibility.
 */
export function getUpcomingWeekends(
  fromDate: Date,
  count: number,
  seedDate: Date,
  seedUserOrder: number,
  users: RotationUser[]
): Array<{ weekStart: Date; user: RotationUser }> {
  const firstSaturday = getWeekSaturday(fromDate);
  const results: Array<{ weekStart: Date; user: RotationUser }> = [];

  for (let i = 0; i < count; i++) {
    const saturday = addWeeks(firstSaturday, i);
    const user = resolveUserForWeekend(
      saturday,
      seedDate,
      seedUserOrder,
      users
    );
    results.push({ weekStart: saturday, user });
  }

  return results;
}
