import { differenceInWeeks, addWeeks, format, nextFriday, isFriday } from 'date-fns';
import { frCA } from 'date-fns/locale';

export interface User {
  name: string;
  phone: string; // E.164 format: +1XXXXXXXXXX
}

export const USERS: User[] = [
  { name: 'Alex',   phone: '+15817457623' },
  { name: 'Joey',   phone: '+15819903681' },
  { name: 'Elo',    phone: '+14182646318' },
  { name: 'Nathan', phone: '+15813099142' },
];

// The anchor date for the rotation calculation.
// This should be the Friday of the week when the first user in the list (Alex) is on call.
const START_DATE = new Date(process.env.START_DATE || '2026-02-27T12:00:00Z');

/**
 * Gets the guardian for a given date.
 * The rotation is calculated mathematically based on the weeks elapsed since a fixed start date.
 * @param date The date to check. Defaults to now.
 * @returns The User who is the guardian for that week.
 */
export function getCurrentGuardian(date: Date = new Date()): User {
  const weeksDiff = differenceInWeeks(date, START_DATE);
  const userIndex = weeksDiff % USERS.length;
  // Ensure the index is not negative for dates before START_DATE
  const adjustedIndex = (userIndex + USERS.length) % USERS.length;
  return USERS[adjustedIndex];
}

/**
 * Gets the upcoming Friday date (this Friday if today is Friday, otherwise next Friday).
 */
function getUpcomingFriday(from: Date = new Date()): Date {
  return isFriday(from) ? from : nextFriday(from);
}

/**
 * Gets the schedule for the next N weekends, anchored on Fridays.
 * @param count The number of upcoming weekends to get the schedule for.
 * @returns An array of objects containing the Friday date and the guardian's name.
 */
export function getNextGuardians(count: number = 13) {
  const firstFriday = getUpcomingFriday();
  const schedule = [];

  for (let i = 0; i < count; i++) {
    const friday = addWeeks(firstFriday, i);
    const guardian = getCurrentGuardian(friday);
    schedule.push({
      friday,
      dateLabel: format(friday, "d MMM", { locale: frCA }),
      name: guardian.name,
    });
  }

  return schedule;
}
