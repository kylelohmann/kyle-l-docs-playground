import crypto from 'node:crypto';

export const EVENT_TYPES = ['round.completed'];

// In-memory store. Subscriptions are lost on restart; see the production checklist in the docs.
export const subscriptions = new Map();

export function createSubscription({ url, events }) {
  const sub = {
    id: `wh_${crypto.randomBytes(8).toString('hex')}`,
    url,
    events,
    secret: `whsec_${crypto.randomBytes(24).toString('hex')}`,
    created_at: new Date().toISOString(),
    recent_deliveries: [],
  };
  subscriptions.set(sub.id, sub);
  return sub;
}

export function publicView(sub, { includeSecret = false } = {}) {
  const { secret, ...rest } = sub;
  return includeSecret ? { ...rest, secret } : rest;
}

export function sign(secret, timestamp, body) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

// Sends `type` to every subscription listening for it. Resolves once all deliveries finish.
export async function dispatch(type, data) {
  const event = {
    id: `evt_${crypto.randomBytes(8).toString('hex')}`,
    type,
    created_at: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(event);
  const targets = [...subscriptions.values()].filter((s) => s.events.includes(type));

  await Promise.all(targets.map(async (sub) => {
    const timestamp = Math.floor(Date.now() / 1000);
    let status = null;
    let error = null;
    try {
      const res = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Arccos-Event': type,
          'Arccos-Signature': `t=${timestamp},v1=${sign(sub.secret, timestamp, body)}`,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
      status = res.status;
    } catch (err) {
      error = err.message;
    }
    sub.recent_deliveries.unshift({ event_id: event.id, type, status, error, delivered_at: new Date().toISOString() });
    sub.recent_deliveries.length = Math.min(sub.recent_deliveries.length, 10);
  }));

  return { event, delivered_to: targets.length };
}
