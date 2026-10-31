import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { COHORTS, addSimulatedRound, players, playerWithCounts, roundsById, roundsByPlayer } from './data.js';
import { WINDOWS, aggregate, clubDistances, compare, selectWindow, strokesGainedVs } from './analytics.js';
import { EVENT_TYPES, createSubscription, dispatch, publicView, subscriptions } from './webhooks.js';

const API_KEYS = new Set((process.env.ARCCOS_API_KEYS || 'sk_test_demo_123').split(','));
const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE || 120);

class ApiError extends Error {
  constructor(status, code, message, param) {
    super(message);
    this.status = status;
    this.code = code;
    this.param = param;
  }
}

const notFound = (what, id) => new ApiError(404, 'resource_not_found', `No ${what} found with id '${id}'.`);

// ---------- Route handlers ----------

const routes = [
  ['GET', '/health', () => ({ status: 'ok' }), { public: true }],

  ['GET', '/v1/players', () => ({ data: [...players.values()].map(playerWithCounts) })],

  ['GET', '/v1/players/:playerId', ({ params }) => playerWithCounts(getPlayer(params.playerId))],

  ['GET', '/v1/players/:playerId/rounds', ({ params, query }) => {
    getPlayer(params.playerId);
    const limit = intParam(query, 'limit', 10, 1, 50);
    const newestFirst = [...roundsByPlayer.get(params.playerId)].reverse();
    let start = 0;
    if (query.get('starting_after')) {
      start = newestFirst.findIndex((r) => r.id === query.get('starting_after')) + 1;
      if (start === 0) throw new ApiError(400, 'invalid_parameter', 'starting_after must be a round id returned by this endpoint.', 'starting_after');
    }
    const page = newestFirst.slice(start, start + limit);
    const hasMore = start + limit < newestFirst.length;
    return {
      data: page.map(({ holes, ...summary }) => summary),
      has_more: hasMore,
      next_cursor: hasMore ? page[page.length - 1].id : null,
    };
  }],

  ['GET', '/v1/rounds/:roundId', ({ params }) => {
    const round = roundsById.get(params.roundId);
    if (!round) throw notFound('round', params.roundId);
    return round;
  }],

  ['GET', '/v1/players/:playerId/stats', ({ params, query }) => {
    const player = getPlayer(params.playerId);
    const window = windowParam(query);
    return { player_id: player.id, window, ...aggregate(selectWindow(roundsByPlayer.get(player.id), window)) };
  }],

  ['GET', '/v1/players/:playerId/strokes-gained', ({ params, query }) => {
    const player = getPlayer(params.playerId);
    const window = windowParam(query);
    const baseline = cohortParam(query, 'baseline', 'scratch');
    return { player_id: player.id, window, ...strokesGainedVs(selectWindow(roundsByPlayer.get(player.id), window), baseline) };
  }],

  ['GET', '/v1/players/:playerId/compare', ({ params, query }) => {
    const player = getPlayer(params.playerId);
    const window = windowParam(query);
    const cohort = cohortParam(query, 'cohort', 'tour_elite');
    return { window, ...compare(player, selectWindow(roundsByPlayer.get(player.id), window), cohort) };
  }],

  ['GET', '/v1/players/:playerId/clubs', ({ params, query }) => {
    const player = getPlayer(params.playerId);
    const cohort = query.get('cohort') ? cohortParam(query, 'cohort') : null;
    const rounds = selectWindow(roundsByPlayer.get(player.id), 'last_20');
    return { player_id: player.id, cohort: cohort ? cohort.id : null, data: clubDistances(player, rounds, cohort) };
  }],

  ['GET', '/v1/benchmarks', () => ({ data: COHORTS.map(cohortView) })],

  ['GET', '/v1/benchmarks/:cohortId', ({ params }) => {
    const cohort = COHORTS.find((c) => c.id === params.cohortId);
    if (!cohort) throw notFound('benchmark cohort', params.cohortId);
    return cohortView(cohort);
  }],

  ['GET', '/v1/webhooks', () => ({ data: [...subscriptions.values()].map((s) => publicView(s)) })],

  ['POST', '/v1/webhooks', ({ body }) => {
    let url;
    try {
      url = new URL(body.url);
    } catch {
      throw new ApiError(400, 'invalid_parameter', 'url must be an absolute http or https URL.', 'url');
    }
    if (!['http:', 'https:'].includes(url.protocol)) throw new ApiError(400, 'invalid_parameter', 'url must use http or https.', 'url');
    const events = body.events ?? EVENT_TYPES;
    if (!Array.isArray(events) || events.length === 0 || events.some((e) => !EVENT_TYPES.includes(e))) {
      throw new ApiError(400, 'invalid_parameter', `events must be a non-empty array of: ${EVENT_TYPES.join(', ')}.`, 'events');
    }
    return [201, publicView(createSubscription({ url: url.toString(), events }), { includeSecret: true })];
  }],

  ['GET', '/v1/webhooks/:webhookId', ({ params }) => publicView(getWebhook(params.webhookId))],

  ['DELETE', '/v1/webhooks/:webhookId', ({ params }) => {
    getWebhook(params.webhookId);
    subscriptions.delete(params.webhookId);
    return { id: params.webhookId, deleted: true };
  }],

  ['POST', '/v1/sandbox/players/:playerId/rounds', async ({ params }) => {
    const player = getPlayer(params.playerId);
    const round = addSimulatedRound(player.id);
    const { event, delivered_to } = await dispatch('round.completed', {
      round_id: round.id,
      player_id: player.id,
      score: round.score,
      to_par: round.to_par,
      course: round.course,
      played_at: round.played_at,
    });
    const { holes, ...summary } = round;
    return [201, { round: summary, event_id: event.id, webhooks_notified: delivered_to }];
  }],
].map(([method, path, handler, opts = {}]) => ({ method, handler, ...opts, ...compilePath(path) }));

// ---------- Parameter helpers ----------

function getPlayer(id) {
  const player = players.get(id);
  if (!player) throw notFound('player', id);
  return player;
}

function getWebhook(id) {
  const sub = subscriptions.get(id);
  if (!sub) throw notFound('webhook', id);
  return sub;
}

function windowParam(query) {
  const window = query.get('window') ?? 'last_20';
  if (!(window in WINDOWS)) {
    throw new ApiError(400, 'invalid_parameter', `window must be one of: ${Object.keys(WINDOWS).join(', ')}.`, 'window');
  }
  return window;
}

function cohortParam(query, name, fallback) {
  const id = query.get(name) ?? fallback;
  const cohort = COHORTS.find((c) => c.id === id);
  if (!cohort) {
    throw new ApiError(400, 'invalid_parameter', `${name} must be one of: ${COHORTS.map((c) => c.id).join(', ')}.`, name);
  }
  return cohort;
}

function intParam(query, name, fallback, min, max) {
  if (!query.has(name)) return fallback;
  const value = Number(query.get(name));
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ApiError(400, 'invalid_parameter', `${name} must be an integer between ${min} and ${max}.`, name);
  }
  return value;
}

function cohortView({ anchor_handicap, ...cohort }) {
  return cohort;
}

// ---------- HTTP plumbing ----------

function compilePath(path) {
  const keys = [];
  const pattern = path.replace(/:(\w+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { keys, regex: new RegExp(`^${pattern}/?$`) };
}

function match(method, pathname) {
  let pathMatched = false;
  for (const route of routes) {
    const m = route.regex.exec(pathname);
    if (!m) continue;
    pathMatched = true;
    if (route.method !== method) continue;
    const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    return { route, params };
  }
  if (pathMatched) throw new ApiError(405, 'method_not_allowed', `${method} is not supported on ${pathname}.`);
  throw new ApiError(404, 'route_not_found', `No route matches ${method} ${pathname}.`);
}

const rateWindows = new Map();

function checkRateLimit(apiKey, res) {
  const windowStart = Math.floor(Date.now() / 60000) * 60000;
  const entry = rateWindows.get(apiKey);
  const used = entry && entry.windowStart === windowStart ? entry.used + 1 : 1;
  rateWindows.set(apiKey, { windowStart, used });
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_PER_MINUTE);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_PER_MINUTE - used));
  res.setHeader('X-RateLimit-Reset', Math.floor((windowStart + 60000) / 1000));
  if (used > RATE_LIMIT_PER_MINUTE) {
    res.setHeader('Retry-After', Math.ceil((windowStart + 60000 - Date.now()) / 1000));
    throw new ApiError(429, 'rate_limited', `Rate limit of ${RATE_LIMIT_PER_MINUTE} requests per minute exceeded.`);
  }
}

function authenticate(req) {
  const header = req.headers.authorization ?? '';
  const [scheme, key] = header.split(' ');
  if (scheme !== 'Bearer' || !key) {
    throw new ApiError(401, 'missing_api_key', 'Send your API key in the Authorization header as "Bearer <key>".');
  }
  if (!API_KEYS.has(key)) throw new ApiError(401, 'invalid_api_key', 'The API key is not valid.');
  return key;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'invalid_json', 'The request body is not valid JSON.');
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    const url = new URL(req.url, 'http://localhost');
    try {
      const { route, params } = match(req.method, url.pathname);
      if (!route.public) checkRateLimit(authenticate(req), res);
      const body = req.method === 'POST' ? await readJson(req) : {};
      const result = await route.handler({ params, query: url.searchParams, body });
      const [status, payload] = Array.isArray(result) ? result : [200, result];
      send(res, status, payload);
    } catch (err) {
      if (err instanceof ApiError) {
        send(res, err.status, { error: { code: err.code, message: err.message, ...(err.param && { param: err.param }) } });
      } else {
        console.error(err);
        send(res, 500, { error: { code: 'internal_error', message: 'Something went wrong on our side.' } });
      }
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4000);
  createServer().listen(port, () => {
    console.log(`Arccos Benchmarks demo API listening on http://localhost:${port}`);
    console.log(`Try: curl -H "Authorization: Bearer sk_test_demo_123" http://localhost:${port}/v1/players`);
  });
}
