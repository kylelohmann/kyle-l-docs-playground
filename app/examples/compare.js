// Prints how a player stacks up against a benchmark cohort.
// Usage: node examples/compare.js [playerId] [cohortId]
const BASE_URL = process.env.ARCCOS_API_URL ?? 'http://localhost:4000';
const API_KEY = process.env.ARCCOS_API_KEY ?? 'sk_test_demo_123';
const [playerId = 'plr_alex_rivera', cohortId = 'tour_elite'] = process.argv.slice(2);

const res = await fetch(`${BASE_URL}/v1/players/${playerId}/compare?cohort=${cohortId}&window=last_20`, {
  headers: { Authorization: `Bearer ${API_KEY}` },
});
const body = await res.json();
if (!res.ok) {
  console.error(`${res.status} ${body.error.code}: ${body.error.message}`);
  process.exit(1);
}

console.log(`${playerId} vs ${body.cohort.name} (last ${body.rounds_included} rounds)\n`);
console.table(body.metrics.map((m) => ({
  metric: m.label,
  you: m.player_value,
  cohort: m.cohort_value,
  gap: m.gap,
  percentile: m.cohort_percentile,
})));
console.log('\nStrokes gained per round vs cohort:');
for (const c of body.strokes_gained.by_category) console.log(`  ${c.label.padEnd(18)} ${c.strokes_per_round.toFixed(2)}`);
console.log(`  ${'Total'.padEnd(18)} ${body.strokes_gained.total.toFixed(2)}\n`);
for (const line of body.insights) console.log(`- ${line}`);
