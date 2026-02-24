import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockCreate, mockGetState, mockSetState } = vi.hoisted(() => ({
  mockCreate: vi.fn().mockResolvedValue({ sid: 'SM_mock' }),
  mockGetState: vi.fn(),
  mockSetState: vi.fn(),
}));

vi.mock('twilio', () => ({
  default: Object.assign(
    vi.fn().mockReturnValue({ messages: { create: mockCreate } }),
    {
      _create: mockCreate,
      validateRequest: vi.fn().mockReturnValue(true),
    }
  ),
}));

vi.mock('@/lib/kv', () => ({
  getWeekendState: mockGetState,
  setWeekendState: mockSetState,
}));

import { POST } from '../route';

function makeRequest(from: string, body: string) {
  const formBody = new URLSearchParams({ From: from, Body: body }).toString();
  return new Request('http://localhost/api/webhooks/twilio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': 'valid',
    },
    body: formBody,
  });
}

const BASE_STATE = {
  weekendDate: '2026-02-28',
  guardian: 'Alex',
  guardianPhone: '+15817457623',
  status: 'urgent' as const,
  sentAt: new Date().toISOString(),
};

describe('POST /api/webhooks/twilio', () => {
  beforeEach(() => {
    process.env.TWILIO_AUTH_TOKEN = 'token_test';
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_PHONE_NUMBER = '+15140000000';
    mockCreate.mockClear();
    mockGetState.mockClear();
    mockSetState.mockClear();
  });

  afterEach(() => {
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_PHONE_NUMBER;
  });

  it('répond TwiML XML', async () => {
    mockGetState.mockResolvedValue(null);
    const res = await POST(makeRequest('+15817457623', 'OUI'));
    expect(res.headers.get('Content-Type')).toBe('text/xml');
    const text = await res.text();
    expect(text).toContain('<Response>');
    expect(text).toContain('<Message>');
  });

  it('gardien OUI → status confirmed', async () => {
    mockGetState.mockResolvedValue({ ...BASE_STATE, status: 'pending' });
    mockSetState.mockResolvedValue(undefined);

    const res = await POST(makeRequest('+15817457623', 'OUI'));
    expect(res.status).toBe(200);
    expect(mockSetState).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'confirmed' })
    );
    const text = await res.text();
    expect(text).toContain('Parfait');
  });

  it('gardien NON → envoie urgence aux 3 autres', async () => {
    mockGetState.mockResolvedValue({ ...BASE_STATE, status: 'pending' });
    mockSetState.mockResolvedValue(undefined);

    await POST(makeRequest('+15817457623', 'NON'));
    // 3 SMS d'urgence
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(mockSetState).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'urgent' })
    );
  });

  it('autre répond OUI en urgence → status replaced', async () => {
    mockGetState.mockResolvedValue(BASE_STATE);
    mockSetState.mockResolvedValue(undefined);

    await POST(makeRequest('+15819903681', 'OUI')); // Joey
    expect(mockSetState).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'replaced', replacedBy: 'Joey' })
    );
  });

  it('autre répond OUI mais déjà remplacé → message refus', async () => {
    mockGetState.mockResolvedValue({
      ...BASE_STATE,
      status: 'replaced',
      replacedBy: 'Joey',
    });

    const res = await POST(makeRequest('+14182646318', 'OUI')); // Elo
    const text = await res.text();
    expect(text).toContain('Joey');
    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('aucun état KV → message générique', async () => {
    mockGetState.mockResolvedValue(null);
    const res = await POST(makeRequest('+15817457623', 'OUI'));
    const text = await res.text();
    expect(text).toContain('Aucune garde active');
  });
});
