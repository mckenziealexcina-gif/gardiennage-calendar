import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock is hoisted — define everything inside the factory
vi.mock('resend', () => {
  const send = vi.fn().mockResolvedValue({ id: 'mock-email-id' });
  return {
    Resend: class {
      emails = { send };
      static _send = send; // expose for test access
    },
  };
});

import { GET } from '../route';
import { Resend } from 'resend';

const VALID_SECRET = 'test-secret-123';

// Access the shared mock function via the static property
function getMockSend() {
  return (Resend as unknown as { _send: ReturnType<typeof vi.fn> })._send;
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
    process.env.RESEND_API_KEY = 're_test_key';
    getMockSend().mockClear();
    getMockSend().mockResolvedValue({ id: 'mock-email-id' });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  it('retourne 401 si cron_secret absent', async () => {
    const req = makeRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe('Unauthorized');
  });

  it('retourne 401 si cron_secret incorrect', async () => {
    const req = makeRequest('mauvais-secret');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe('Unauthorized');
  });

  it('retourne 200 avec le bon secret et appelle Resend', async () => {
    const req = makeRequest(VALID_SECRET);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/Reminder sent to/);
  });

  it('le message de succès contient le nom du gardien actuel', async () => {
    const req = makeRequest(VALID_SECRET);
    const res = await GET(req);
    const body = await res.json();
    const validNames = ['Alex', 'Joey', 'Elo', 'Nathan'];
    const hasValidName = validNames.some((name) => body.message.includes(name));
    expect(hasValidName).toBe(true);
  });

  it('Resend.emails.send est bien appelé avec les bons paramètres', async () => {
    const req = makeRequest(VALID_SECRET);
    await GET(req);
    expect(getMockSend()).toHaveBeenCalledOnce();
    const callArgs = getMockSend().mock.calls[0][0];
    expect(callArgs).toMatchObject({
      subject: 'Rappel Gardiennage',
      text: "C'est ton tour ce weekend!",
    });
  });

  it('retourne 500 si Resend lève une erreur', async () => {
    getMockSend().mockRejectedValueOnce(new Error('Resend API down'));
    const req = makeRequest(VALID_SECRET);
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe('Error sending reminder');
  });
});
