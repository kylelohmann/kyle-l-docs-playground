# Arccos Benchmarks demo API

A dependency-free Node.js API that serves generated golf data and compares players with benchmark cohorts. It backs the documentation in the parent folder. This is a demo, not an official Arccos API.

```bash
npm start      # http://localhost:4000
npm run dev    # restart on file changes
npm test       # end-to-end tests
```

Default API key: `sk_test_demo_123`.

```bash
curl -H "Authorization: Bearer sk_test_demo_123" \
  "http://localhost:4000/v1/players/plr_alex_rivera/compare?cohort=tour_elite"
```

See `build/architecture.mdx` in the docs for how the code is organized.
