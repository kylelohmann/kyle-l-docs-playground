import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../src/server.js';
import { sign } from '../src/webhooks.js';

const KEY = 'sk_test_demo_123';
let server;
let base;

before(async () => {
  server = createServer().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

async function api(path, { method = 'GET', body, key = KEY } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(key && { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, json: await res.json() };
}

test('health check needs no API key', async () => {
  const { status, json } = await api('/health', { key: null });
  assert.equal(status, 200);
  assert.equal(json.status, 'ok');
});

test('rejects missing and invalid API keys', async () => {
  assert.equal((await api('/v1/players', { key: null })).json.error.code, 'missing_api_key');
  assert.equal((await api('/v1/players', { key: 'sk_test_nope' })).status, 401);
});

test('lists players with rate limit headers', async () => {
  const { status, json, headers } = await api('/v1/players');
  assert.equal(status, 200);
  assert.equal(json.data.length, 3);
  assert.ok(headers.get('x-ratelimit-remaining'));
});

test('paginates rounds newest first', async () => {
  const first = await api('/v1/players/plr_alex_rivera/rounds?limit=5');
  assert.equal(first.json.data.length, 5);
  assert.equal(first.json.has_more, true);
  assert.equal(first.json.data[0].holes, undefined);
  const second = await api(`/v1/players/plr_alex_rivera/rounds?limit=5&starting_after=${first.json.next_cursor}`);
  assert.notEqual(second.json.data[0].id, first.json.data[0].id);
  assert.ok(second.json.data[0].played_at < first.json.data[4].played_at || second.json.data[0].played_at === first.json.data[4].played_at);
});

test('round detail has 18 holes that add up to the score', async () => {
  const { json } = await api('/v1/rounds/rnd_alex_rivera_001');
  assert.equal(json.holes.length, 18);
  assert.equal(json.holes.reduce((s, h) => s + h.score, 0), json.score);
});

test('compares a player with a cohort', async () => {
  const { status, json } = await api('/v1/players/plr_alex_rivera/compare?cohort=tour_elite&window=last_10');
  assert.equal(status, 200);
  assert.equal(json.rounds_included, 10);
  assert.equal(json.metrics.length, 8);
  assert.equal(json.strokes_gained.by_category.length, 4);
  assert.ok(json.insights.length > 0);
});

test('validates query parameters', async () => {
  const { status, json } = await api('/v1/players/plr_alex_rivera/compare?cohort=pga_tour');
  assert.equal(status, 400);
  assert.equal(json.error.param, 'cohort');
});

test('returns 404 for unknown resources and routes', async () => {
  assert.equal((await api('/v1/players/plr_nobody')).json.error.code, 'resource_not_found');
  assert.equal((await api('/v1/nothing')).json.error.code, 'route_not_found');
});

test('delivers signed round.completed webhooks', async () => {
  let received;
  const receiver = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      received = { raw, signature: req.headers['arccos-signature'] };
      res.writeHead(200).end();
    });
  }).listen(0);
  await new Promise((resolve) => receiver.once('listening', resolve));

  const sub = await api('/v1/webhooks', { method: 'POST', body: { url: `http://localhost:${receiver.address().port}/hooks` } });
  assert.equal(sub.status, 201);
  assert.match(sub.json.secret, /^whsec_/);

  const sim = await api('/v1/sandbox/players/plr_sam_okafor/rounds', { method: 'POST' });
  assert.equal(sim.status, 201);
  assert.equal(sim.json.webhooks_notified, 1);

  const [, t, v1] = received.signature.match(/^t=(\d+),v1=([0-9a-f]+)$/);
  assert.equal(v1, sign(sub.json.secret, t, received.raw));
  assert.equal(JSON.parse(received.raw).data.round_id, sim.json.round.id);

  const listed = await api(`/v1/webhooks/${sub.json.id}`);
  assert.equal(listed.json.secret, undefined);
  assert.equal(listed.json.recent_deliveries[0].status, 200);

  assert.equal((await api(`/v1/webhooks/${sub.json.id}`, { method: 'DELETE' })).json.deleted, true);
  receiver.close();
});
