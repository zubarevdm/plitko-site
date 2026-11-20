const REQUEST_TIMEOUT_MS = 10000;

/**
 * Sends a lead to the server-side relay (which forwards it to Telegram).
 * Never throws: always resolves with { ok } or { ok:false, reason }.
 * reason: 'no-endpoint' | 'server' | 'network'
 */
export async function submitLead(lead, { endpoint, utm = {}, fetchImpl = fetch } = {}) {
  if (!endpoint) return { ok: false, reason: 'no-endpoint' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: lead.name,
        contact: lead.contact,
        wall: lead.wall,
        utm,
        page: typeof location === 'undefined' ? '' : location.href,
      }),
      signal: controller.signal,
    });
    return response.ok ? { ok: true } : { ok: false, reason: 'server' };
  } catch {
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
