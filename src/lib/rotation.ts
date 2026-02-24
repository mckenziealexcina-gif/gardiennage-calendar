import { differenceInWeeks, addWeeks, format } from 'date-fns';

export interface User {
  name: string;
  email: string; // Phone-to-email gateway
}

// NOTE: Replace with actual phone-to-email gateways
export const USERS: User[] = [
  { name: 'Alex', email: '1111111111@vmobile.ca' },
  { name: 'Joey', email: '2222222222@txt.bell.ca' },
  { name: 'Elo', email: '3333333333@vmobile.ca' },
  { name: 'Nathan', email: '4444444444@txt.bell.ca' },
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
 * Gets the schedule for the next N weekends.
 * @param count The number of upcoming weekends to get the schedule for.
 * @returns An array of objects containing the weekend date and the guardian's name.
 */
export function getNextGuardians(count: number = 4) {
  const today = new Date();
  const schedule = [];

  for (let i = 0; i < count; i++) {
    const upcomingDate = addWeeks(today, i);
    const guardian = getCurrentGuardian(upcomingDate);
    // You might want to format the date to show the specific weekend
    const weekendDate = format(upcomingDate, 'MMMM d, yyyy');
    schedule.push({
      date: weekendDate,
      name: guardian.name,
    });
  }

  return schedule;
}
