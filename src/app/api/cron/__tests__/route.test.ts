import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('twilio', () => {
  const create = vi.fn().mockResolvedValue({ sid: 'SM_mock_sid' });
  const client = { messages: { create } };
  return {
    default: Object.assign(vi.fn().mockReturnValue(client), { _create: create }),
  };
});

import { GET } from '../route';
import twilio from 'twilio';

const VALID_SECRET = 'test-secret-123';

function getMockCreate() {
  return (twilio as unknown as { _create: ReturnType<typeof vi.fn> })._create;
}

function makeRequest(secret?: string): Request {
  const url = secret
    ? `http://localhost/api/cron?cron_secret=${secret}`
    : 'http://localhost/api/cron';
  return new Request(url, { method: 'GET' });
}

describe("Tests d'intégration — GET /api/cron", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = VALID_SECRET;
    process.env.TWILIO_ACCOUNT_SID = 'AC_test';
    process.env.TWILIO_AUTH_TOKEN = 'token_test';
    process.env.TWILIO_PHONE_NUMBER = '+15140000000';
    getMockCreate().mockClear();
    getMockCreate().mockResolvedValue({ sid: 'SM_mock_sid' });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
  });

  it('retourne 401 si cron_secret absent', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect((await res.json()).message).toBe('Unauthorized');
  });

  it('retourne 401 si cron_secret incorrect', async () => {
    const res = await GET(makeRequest('mauvais-secret'));
    expect(res.status).toBe(401);
    expect((await res.json()).message).toBe('Unauthorized');
  });

  it('retourne 200 avec le bon secret', async () => {
    const res = await GET(makeRequest(VALID_SECRET));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toMatch(/SMS sent to/);
  });

  it('le message contient un nom valide', async () => {
    const res = await GET(makeRequest(VALID_SECRET));
    const body = await res.json();
    const validNames = ['Alex', 'Joey', 'Elo', 'Nathan'];
    expect(validNames.some((n) => body.message.includes(n))).toBe(true);
  });

  it('twilio.messages.create est appelé avec les bons params', async () => {
    await GET(makeRequest(VALID_SECRET));
    expect(getMockCreate()).toHaveBeenCalledOnce();
    const args = getMockCreate().mock.calls[0][0];
    expect(args.from).toBe('+15140000000');
    expect(args.to).toMatch(/^\+1\d{10}$/);
    expect(args.body).toContain("c'est ton tour");
  });

  it('retourne 500 si Twilio lève une erreur', async () => {
    getMockCreate().mockRejectedValueOnce(new Error('Twilio down'));
    const res = await GET(makeRequest(VALID_SECRET));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe('Error sending SMS');
  });
});
