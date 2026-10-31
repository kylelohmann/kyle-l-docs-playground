import { CLUBS, METRICS, SG_CATEGORIES, round1, round2, sum } from './data.js';

export const WINDOWS = { last_5: 5, last_10: 10, last_20: 20, all: Infinity };

const SG_LABELS = {
  off_the_tee: 'Off the tee',
  approach: 'Approach',
  around_the_green: 'Around the green',
  putting: 'Putting',
};

export function selectWindow(rounds, window) {
  const size = WINDOWS[window];
  return size === Infinity ? rounds : rounds.slice(-size);
}

// Averages a set of rounds into the same stat shape that cohorts use.
export function aggregate(rounds) {
  const holes = rounds.flatMap((r) => r.holes);
  const drivingHoles = holes.filter((h) => h.fairway_hit !== null);
  const missedGreens = holes.filter((h) => !h.gir);
  const sandHoles = holes.filter((h) => h.sand_shot);
  const pct = (part, whole) => (whole === 0 ? 0 : round1((100 * part) / whole));
  const avg = (values) => sum(values) / values.length;

  const normalizedScores = rounds.map((r) => r.score - r.course.par + 72);
  const strokes_gained = {};
  for (const c of [...SG_CATEGORIES, 'total']) strokes_gained[c] = round2(avg(rounds.map((r) => r.strokes_gained[c])));

  return {
    rounds_included: rounds.length,
    stats: {
      scoring_average: round1(avg(normalizedScores)),
      driving_distance_yds: Math.round(avg(rounds.map((r) => r.driving_distance_yds))),
      fairways_hit_pct: pct(drivingHoles.filter((h) => h.fairway_hit).length, drivingHoles.length),
      gir_pct: pct(holes.filter((h) => h.gir).length, holes.length),
      scrambling_pct: pct(missedGreens.filter((h) => h.score <= h.par).length, missedGreens.length),
      putts_per_round: round1(sum(holes.map((h) => h.putts)) / rounds.length),
      three_putt_pct: pct(holes.filter((h) => h.putts >= 3).length, holes.length),
      sand_save_pct: pct(sandHoles.filter((h) => h.score <= h.par).length, sandHoles.length),
    },
    strokes_gained,
  };
}

// Strokes gained per round, re-based from the scratch baseline onto `cohort`.
export function strokesGainedVs(rounds, cohort) {
  const rebase = (sg) => {
    const out = {};
    for (const c of [...SG_CATEGORIES, 'total']) out[c] = round2(sg[c] - cohort.strokes_gained[c]);
    return out;
  };
  const { strokes_gained } = aggregate(rounds);
  return {
    baseline: cohort.id,
    average: rebase(strokes_gained),
    rounds: rounds.map((r) => ({ round_id: r.id, played_at: r.played_at, ...rebase(r.strokes_gained) })),
  };
}

export function compare(player, rounds, cohort) {
  const { stats, strokes_gained } = aggregate(rounds);

  const metrics = METRICS.map((m) => {
    const playerValue = stats[m.key];
    const cohortValue = cohort.stats[m.key];
    const gap = playerValue - cohortValue;
    return {
      metric: m.key,
      label: m.label,
      unit: m.unit,
      higher_is_better: m.higher_is_better,
      player_value: playerValue,
      cohort_value: cohortValue,
      gap: round2(gap),
      outperforming: m.higher_is_better ? gap > 0 : gap < 0,
      cohort_percentile: percentile(playerValue, cohortValue, m.spread, m.higher_is_better),
    };
  });

  const sgGaps = SG_CATEGORIES.map((c) => ({
    category: c,
    label: SG_LABELS[c],
    strokes_per_round: round2(strokes_gained[c] - cohort.strokes_gained[c]),
  })).sort((a, b) => a.strokes_per_round - b.strokes_per_round);
  const totalGap = round2(strokes_gained.total - cohort.strokes_gained.total);

  return {
    player_id: player.id,
    cohort: { id: cohort.id, name: cohort.name },
    rounds_included: rounds.length,
    strokes_gained: {
      total: totalGap,
      by_category: sgGaps,
    },
    metrics,
    biggest_opportunity: sgGaps[0].strokes_per_round < 0 ? sgGaps[0].category : null,
    insights: buildInsights(sgGaps, totalGap, cohort),
  };
}

export function clubDistances(player, rounds, cohort) {
  const drive = sum(rounds.map((r) => r.driving_distance_yds)) / rounds.length;
  // Players gap their clubs a little differently; a per-player offset keeps that stable between calls.
  const offset = (club) => ((hash(player.id + club) % 7) - 3) * 0.004;
  return CLUBS.map(([club, label, factor]) => {
    const carry = Math.round(drive * (factor + (club === 'driver' ? 0 : offset(club))) * 0.93);
    const entry = { club, label, avg_carry_yds: carry };
    if (cohort) {
      entry.cohort_avg_carry_yds = Math.round(cohort.stats.driving_distance_yds * factor * 0.93);
      entry.gap_yds = carry - entry.cohort_avg_carry_yds;
    }
    return entry;
  });
}

function buildInsights(sgGaps, totalGap, cohort) {
  const insights = [];
  const fmt = (n) => Math.abs(n).toFixed(1);
  if (totalGap >= 0) {
    insights.push(`You're gaining ${fmt(totalGap)} strokes per round on the ${cohort.name} cohort.`);
  } else {
    insights.push(`You're ${fmt(totalGap)} strokes per round behind the ${cohort.name} cohort.`);
  }
  const worst = sgGaps[0];
  if (worst.strokes_per_round < 0) {
    const share = totalGap < 0 ? Math.min(100, Math.round((100 * worst.strokes_per_round) / totalGap)) : null;
    insights.push(`${worst.label} is your biggest gap at ${fmt(worst.strokes_per_round)} strokes per round${share ? ` (${share}% of the total)` : ''}.`);
  }
  const best = sgGaps[sgGaps.length - 1];
  if (best.strokes_per_round > 0) {
    insights.push(`${best.label} is a strength: you gain ${fmt(best.strokes_per_round)} strokes per round there.`);
  }
  return insights;
}

// Where `value` falls in the cohort's distribution, assuming it is roughly normal around the cohort mean.
export function percentile(value, mean, spread, higherIsBetter) {
  const z = (value - mean) / spread;
  const p = normalCdf(higherIsBetter ? z : -z);
  return Math.min(99, Math.max(1, Math.round(p * 100)));
}

function normalCdf(z) {
  // Abramowitz and Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
