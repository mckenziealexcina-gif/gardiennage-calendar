import { kv } from '@vercel/kv';
import { nextSaturday, isSaturday, format } from 'date-fns';

export interface WeekendState {
  weekendDate: string;      // "2026-02-28" (samedi)
  guardian: string;         // "Alex"
  guardianPhone: string;    // "+15817457623"
  status: 'pending' | 'confirmed' | 'declined' | 'urgent' | 'replaced';
  sentAt: string;           // ISO timestamp
  urgentSentAt?: string;
  replacedBy?: string;      // nom du remplaçant
  replacedByPhone?: string;
}

const TTL_SECONDS = 72 * 60 * 60; // 72 heures

export function getSaturdayKey(from: Date = new Date()): string {
  const sat = isSaturday(from) ? from : nextSaturday(from);
  return `weekend:${format(sat, 'yyyy-MM-dd')}`;
}

export async function getWeekendState(satDate: string): Promise<WeekendState | null> {
  return kv.get<WeekendState>(`weekend:${satDate}`);
}

export async function setWeekendState(satDate: string, state: WeekendState): Promise<void> {
  await kv.set(`weekend:${satDate}`, state, { ex: TTL_SECONDS });
}
