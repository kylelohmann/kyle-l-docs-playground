// Sample data for the Arccos Benchmarks demo API.
// Everything is generated from a fixed seed, so responses are identical on every start.

export const METRICS = [
  { key: 'scoring_average', label: 'Scoring average', unit: 'strokes', higher_is_better: false, spread: 2.5 },
  { key: 'driving_distance_yds', label: 'Driving distance', unit: 'yards', higher_is_better: true, spread: 14 },
  { key: 'fairways_hit_pct', label: 'Fairways hit', unit: 'percent', higher_is_better: true, spread: 9 },
  { key: 'gir_pct', label: 'Greens in regulation', unit: 'percent', higher_is_better: true, spread: 8 },
  { key: 'scrambling_pct', label: 'Scrambling', unit: 'percent', higher_is_better: true, spread: 9 },
  { key: 'putts_per_round', label: 'Putts per round', unit: 'putts', higher_is_better: false, spread: 1.3 },
  { key: 'three_putt_pct', label: 'Three-putt rate', unit: 'percent', higher_is_better: false, spread: 2.5 },
  { key: 'sand_save_pct', label: 'Sand saves', unit: 'percent', higher_is_better: true, spread: 12 },
];

export const SG_CATEGORIES = ['off_the_tee', 'approach', 'around_the_green', 'putting'];

// Strokes gained is measured against the scratch cohort, whose scoring average is
// SCRATCH_OVER_PAR strokes over par. Every cohort's scoring average follows from its SG total.
export const SCRATCH_OVER_PAR = 1.5;

export const COHORTS = [
  cohort('tour_elite', 'Tour elite', 'Arccos golfers with a handicap index of +2 or better. The closest proxy for tour-level play.', -3, { min: -8, max: -2 }, 3870,
    { driving_distance_yds: 286, fairways_hit_pct: 58.2, gir_pct: 64.5, scrambling_pct: 58.1, putts_per_round: 29.1, three_putt_pct: 3.1, sand_save_pct: 49.8 },
    { off_the_tee: 0.6, approach: 0.9, around_the_green: 0.3, putting: 0.4 }),
  cohort('scratch', 'Scratch', 'Arccos golfers with a handicap index between +1.9 and 1.9.', 0, { min: -1.9, max: 1.9 }, 21450,
    { driving_distance_yds: 266, fairways_hit_pct: 55.4, gir_pct: 55.8, scrambling_pct: 48.2, putts_per_round: 30.1, three_putt_pct: 5.0, sand_save_pct: 38.5 },
    { off_the_tee: 0, approach: 0, around_the_green: 0, putting: 0 }),
  cohort('hcp_5', '5 handicap', 'Arccos golfers with a handicap index between 2.0 and 7.4.', 5, { min: 2, max: 7.4 }, 88210,
    { driving_distance_yds: 251, fairways_hit_pct: 50.6, gir_pct: 44.1, scrambling_pct: 37.9, putts_per_round: 31.0, three_putt_pct: 7.8, sand_save_pct: 27.4 },
    { off_the_tee: -1.0, approach: -1.8, around_the_green: -0.6, putting: -0.6 }),
  cohort('hcp_10', '10 handicap', 'Arccos golfers with a handicap index between 7.5 and 12.4.', 10, { min: 7.5, max: 12.4 }, 142380,
    { driving_distance_yds: 238, fairways_hit_pct: 46.3, gir_pct: 33.2, scrambling_pct: 28.4, putts_per_round: 32.0, three_putt_pct: 10.9, sand_save_pct: 18.6 },
    { off_the_tee: -2.0, approach: -3.8, around_the_green: -1.5, putting: -1.2 }),
  cohort('hcp_15', '15 handicap', 'Arccos golfers with a handicap index between 12.5 and 17.4.', 15, { min: 12.5, max: 17.4 }, 131900,
    { driving_distance_yds: 225, fairways_hit_pct: 42.1, gir_pct: 24.0, scrambling_pct: 20.3, putts_per_round: 33.0, three_putt_pct: 13.8, sand_save_pct: 12.1 },
    { off_the_tee: -3.0, approach: -5.8, around_the_green: -2.4, putting: -1.8 }),
  cohort('hcp_20', '20 handicap', 'Arccos golfers with a handicap index of 17.5 or higher.', 20, { min: 17.5, max: 54 }, 97640,
    { driving_distance_yds: 212, fairways_hit_pct: 38.0, gir_pct: 16.2, scrambling_pct: 14.2, putts_per_round: 34.0, three_putt_pct: 17.1, sand_save_pct: 7.9 },
    { off_the_tee: -4.0, approach: -7.8, around_the_green: -3.2, putting: -2.5 }),
];

function cohort(id, name, description, anchor_handicap, handicap_range, sample_size, stats, strokes_gained) {
  const sgTotal = round2(sum(Object.values(strokes_gained)));
  return {
    id,
    name,
    description,
    anchor_handicap,
    handicap_range,
    sample_size,
    stats: { scoring_average: round1(72 + SCRATCH_OVER_PAR - sgTotal), ...stats },
    strokes_gained: { ...strokes_gained, total: sgTotal },
  };
}

export const CLUBS = [
  ['driver', 'Driver', 1],
  ['3_wood', '3 wood', 0.9],
  ['4_hybrid', '4 hybrid', 0.82],
  ['5_iron', '5 iron', 0.78],
  ['6_iron', '6 iron', 0.74],
  ['7_iron', '7 iron', 0.7],
  ['8_iron', '8 iron', 0.66],
  ['9_iron', '9 iron', 0.62],
  ['pw', 'Pitching wedge', 0.57],
  ['gw', 'Gap wedge', 0.51],
  ['sw', 'Sand wedge', 0.45],
  ['lw', 'Lob wedge', 0.38],
];

const COURSES = [
  { id: 'crs_cedar_ridge', name: 'Cedar Ridge Golf Club', pars: [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5] },
  { id: 'crs_harbor_point', name: 'Harbor Point Links', pars: [5, 4, 4, 3, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 4, 3, 5] },
  { id: 'crs_sandhill', name: 'Sandhill Municipal', pars: [4, 5, 3, 4, 4, 3, 4, 5, 4, 4, 4, 3, 4, 5, 3, 4, 4, 4] },
];

const PLAYER_SEEDS = [
  { id: 'plr_alex_rivera', display_name: 'Alex Rivera', handicap_index: 11.8, home_course_id: 'crs_cedar_ridge', member_since: '2023-04-02' },
  { id: 'plr_sam_okafor', display_name: 'Sam Okafor', handicap_index: 3.6, home_course_id: 'crs_harbor_point', member_since: '2021-08-19' },
  { id: 'plr_jordan_lee', display_name: 'Jordan Lee', handicap_index: 19.4, home_course_id: 'crs_sandhill', member_since: '2025-03-11' },
];

const ROUNDS_PER_PLAYER = 24;
const LATEST_ROUND_DATE = Date.UTC(2026, 9, 25);
const DAY_MS = 24 * 60 * 60 * 1000;

const rng = mulberry32(20261030);

export const players = new Map();
export const roundsByPlayer = new Map();
export const roundsById = new Map();

for (const seed of PLAYER_SEEDS) {
  const rounds = [];
  for (let i = 0; i < ROUNDS_PER_PLAYER; i++) {
    const playedAt = new Date(LATEST_ROUND_DATE - (ROUNDS_PER_PLAYER - 1 - i) * 6 * DAY_MS);
    rounds.push(generateRound(seed, i + 1, playedAt));
  }
  players.set(seed.id, {
    id: seed.id,
    display_name: seed.display_name,
    handicap_index: seed.handicap_index,
    home_course: courseRef(seed.home_course_id),
    member_since: seed.member_since,
  });
  roundsByPlayer.set(seed.id, rounds);
  for (const round of rounds) roundsById.set(round.id, round);
}

// Used by the sandbox endpoint to simulate a new round syncing from a player's sensors.
export function addSimulatedRound(playerId) {
  const player = players.get(playerId);
  const rounds = roundsByPlayer.get(playerId);
  const round = generateRound(player, rounds.length + 1, new Date());
  rounds.push(round);
  roundsById.set(round.id, round);
  return round;
}

export function playerWithCounts(player) {
  return { ...player, rounds_tracked: roundsByPlayer.get(player.id).length };
}

// Linear interpolation between the two cohorts whose anchor handicaps surround `handicap`.
export function expectedForHandicap(handicap) {
  const sorted = [...COHORTS].sort((a, b) => a.anchor_handicap - b.anchor_handicap);
  if (handicap <= sorted[0].anchor_handicap) return sorted[0];
  const last = sorted[sorted.length - 1];
  if (handicap >= last.anchor_handicap) return last;
  const upper = sorted.findIndex((c) => c.anchor_handicap >= handicap);
  const a = sorted[upper - 1];
  const b = sorted[upper];
  const t = (handicap - a.anchor_handicap) / (b.anchor_handicap - a.anchor_handicap);
  const lerp = (x, y) => x + (y - x) * t;
  const stats = {};
  for (const key of Object.keys(a.stats)) stats[key] = lerp(a.stats[key], b.stats[key]);
  const strokes_gained = {};
  for (const key of Object.keys(a.strokes_gained)) strokes_gained[key] = lerp(a.strokes_gained[key], b.strokes_gained[key]);
  return { stats, strokes_gained };
}

function generateRound(player, number, playedAt) {
  const expected = expectedForHandicap(player.handicap_index);
  const course = COURSES[Math.floor(rng() * COURSES.length)];
  const par = sum(course.pars);
  const targetScore = Math.round(par + SCRATCH_OVER_PAR - normal(expected.strokes_gained.total, 2.2));

  const holes = course.pars.map((holePar, i) => playHole(i + 1, holePar, expected.stats));
  balanceToTarget(holes, targetScore);

  const score = sum(holes.map((h) => h.score));
  const sgTotal = par + SCRATCH_OVER_PAR - score;
  const sg = {};
  for (const c of SG_CATEGORIES) sg[c] = expected.strokes_gained[c] + normal(0, 0.9);
  const residual = (sgTotal - sum(Object.values(sg))) / SG_CATEGORIES.length;
  for (const c of SG_CATEGORIES) sg[c] = round2(sg[c] + residual);

  return {
    id: `rnd_${player.id.slice(4)}_${String(number).padStart(3, '0')}`,
    player_id: player.id,
    course: { id: course.id, name: course.name, par },
    played_at: playedAt.toISOString(),
    score,
    to_par: score - par,
    driving_distance_yds: Math.round(normal(expected.stats.driving_distance_yds, 8)),
    strokes_gained: { ...sg, total: round2(sgTotal) },
    holes,
  };
}

function playHole(number, par, stats) {
  const fairway_hit = par >= 4 ? rng() < stats.fairways_hit_pct / 100 : null;
  const gir = rng() < stats.gir_pct / 100;
  const threePutt = () => rng() < stats.three_putt_pct / 100;
  let strokesToGreen;
  let putts;
  let sand_shot = false;
  if (gir) {
    strokesToGreen = par - 2;
    putts = rng() < 0.12 ? 1 : threePutt() ? 3 : 2;
  } else {
    strokesToGreen = par - 1;
    sand_shot = rng() < 0.18;
    const saveRate = (sand_shot ? stats.sand_save_pct : stats.scrambling_pct) / 100;
    putts = rng() < saveRate ? 1 : threePutt() ? 3 : 2;
  }
  return { number, par, score: strokesToGreen + putts, putts, fairway_hit, gir, sand_shot };
}

// Nudges hole scores until the round total matches the target, keeping each hole internally consistent.
function balanceToTarget(holes, target) {
  let diff = target - sum(holes.map((h) => h.score));
  for (let guard = 0; diff !== 0 && guard < 1000; guard++) {
    const h = holes[Math.floor(rng() * holes.length)];
    const strokesToGreen = h.score - h.putts;
    if (diff > 0) {
      if (!h.gir) h.score++;
      else if (h.putts < 3) { h.putts++; h.score++; }
      else continue;
      diff--;
    } else {
      if (!h.gir && strokesToGreen > h.par - 1) h.score--;
      else if (h.putts > 1) { h.putts--; h.score--; }
      else continue;
      diff++;
    }
  }
}

function courseRef(id) {
  const c = COURSES.find((course) => course.id === id);
  return { id: c.id, name: c.name, par: sum(c.pars) };
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(mean, sd) {
  const u = 1 - rng();
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function sum(values) {
  return values.reduce((acc, v) => acc + v, 0);
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}
