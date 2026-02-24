import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @vercel/kv
const store = new Map<string, unknown>();
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
  },
}));

import { getWeekendState, setWeekendState, getSaturdayKey, WeekendState } from '../kv';

const SAMPLE_STATE: WeekendState = {
  weekendDate: '2026-02-28',
  guardian: 'Alex',
  guardianPhone: '+15817457623',
  status: 'pending',
  sentAt: '2026-02-27T10:00:00.000Z',
};

describe('KV helpers', () => {
  beforeEach(() => store.clear());

  it('getWeekendState retourne null si rien dans KV', async () => {
    const result = await getWeekendState('2026-02-28');
    expect(result).toBeNull();
  });

  it('setWeekendState + getWeekendState round-trip', async () => {
    await setWeekendState('2026-02-28', SAMPLE_STATE);
    const result = await getWeekendState('2026-02-28');
    expect(result).toEqual(SAMPLE_STATE);
  });

  it('getSaturdayKey retourne une clé au format weekend:YYYY-MM-DD', () => {
    const key = getSaturdayKey(new Date('2026-02-27T12:00:00Z')); // vendredi
    expect(key).toMatch(/^weekend:\d{4}-\d{2}-\d{2}$/);
    expect(key).toBe('weekend:2026-02-28');
  });

  it('getSaturdayKey avec un samedi retourne ce samedi', () => {
    const key = getSaturdayKey(new Date('2026-02-28T12:00:00Z')); // samedi
    expect(key).toBe('weekend:2026-02-28');
  });
});
