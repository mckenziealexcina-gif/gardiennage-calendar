import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockCreate, mockGetState, mockSetState } = vi.hoisted(() => ({
  mockCreate: vi.fn().mockResolvedValue({ sid: 'SM_mock' }),
  mockGetState: vi.fn(),
  mockSetState: vi.fn(),
}));

vi.mock('twilio', () => ({
  default: Object.assign(
    vi.fn().mockReturnValue({ messages: { create: mockCreate } }),
    { _create: mockCreate }
  ),
}));

vi.mock('@/lib/kv', () => ({
  getWeekendState: mockGetState,
  setWeekendState: mockSetState,
}));

import { GET } from '../route';

const VALID_SECRET = 'test-secret';

function makeRequest(secret?: string) {
  const url = secret
    ? `http://localhost/api/cron/remind?cron_secret=${secret}`
    : 'http://localhost/api/cron/remind';
  return new Request(url);
}

describe('GET /api/cron/remind', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = VALID_SECRET;
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'token_test';
    process.env.TWILIO_PHONE_NUMBER = '+15140000000';
    mockCreate.mockClear();
    mockGetState.mockClear();
    mockSetState.mockClear();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
  });

  it('retourne 401 sans secret', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('no-op si status = confirmed', async () => {
    mockGetState.mockResolvedValue({ status: 'confirmed' });
    const res = await GET(makeRequest(VALID_SECRET));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toContain('confirmed');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('no-op si aucun state dans KV', async () => {
    mockGetState.mockResolvedValue(null);
    const res = await GET(makeRequest(VALID_SECRET));
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('envoie urgence aux 3 autres si status = pending', async () => {
    mockGetState.mockResolvedValue({
      weekendDate: '2026-02-28',
      guardian: 'Alex',
      guardianPhone: '+15817457623',
      status: 'pending',
      sentAt: new Date().toISOString(),
    });
    mockSetState.mockResolvedValue(undefined);

    const res = await GET(makeRequest(VALID_SECRET));
    expect(res.status).toBe(200);
    // 3 SMS envoyés (Joey, Elo, Nathan)
    expect(mockCreate).toHaveBeenCalledTimes(3);
    // State mis à jour
    expect(mockSetState).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'urgent' })
    );
  });
});
