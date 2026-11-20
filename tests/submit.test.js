import { describe, expect, it, vi } from 'vitest';
import { submitLead } from '../src/form/submit.js';

const lead = { name: 'Анна', contact: '@anna_k', wall: '', consent: true };

describe('submitLead', () => {
  it('reports no-endpoint explicitly instead of dropping the lead', async () => {
    const result = await submitLead(lead, { endpoint: '', fetchImpl: vi.fn() });
    expect(result).toEqual({ ok: false, reason: 'no-endpoint' });
  });

  it('posts JSON with utm data and returns ok on 2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const result = await submitLead(lead, {
      endpoint: 'https://example.test/lead',
      utm: { utm_source: 'tg' },
      fetchImpl,
    });
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://example.test/lead');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({ name: 'Анна', utm: { utm_source: 'tg' } });
  });

  it('returns a server error reason on non-2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const result = await submitLead(lead, { endpoint: 'https://example.test', fetchImpl });
    expect(result).toEqual({ ok: false, reason: 'server' });
  });

  it('returns a network reason when fetch throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await submitLead(lead, { endpoint: 'https://example.test', fetchImpl });
    expect(result).toEqual({ ok: false, reason: 'network' });
  });
});
