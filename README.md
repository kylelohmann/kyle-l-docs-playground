# Arccos Benchmarks API docs

Documentation and a demo API for building golf apps on Arccos shot-tracking data. The API returns a golfer's rounds, stats, strokes gained, and club distances. It compares them with benchmark cohorts, from tour-level players to 20 handicaps, and sends webhooks when a new round syncs.

> The API serves generated sample data for three fictional players and is not an official Arccos API. Cohort numbers are illustrative.

## What's in this repo

| Path | Contents |
| --- | --- |
| `app/` | The demo API: Node.js 20+, no dependencies, in-memory data |
| `app/src/` | Routes and auth (`server.js`), sample data (`data.js`), comparison math (`analytics.js`), webhooks (`webhooks.js`) |
| `app/test/` | End-to-end tests |
| `app/examples/` | A comparison script and a webhook receiver that verifies signatures |
| `openapi.yaml` | The API contract. Mintlify generates the API reference from it. |
| `docs.json` | Site configuration: navigation, theme, playground settings |
| `index.mdx`, `quickstart.mdx`, `concepts.mdx` | Get started pages |
| `guides/` | Comparing with tour players, strokes gained, webhooks, authentication, errors |
| `build/` | Architecture, recipes for extending the app, and a production checklist |

`app/` is listed in `.mintignore`, so it isn't published with the docs.

## Run the API

```bash
cd app
npm start    # http://localhost:4000
npm test     # end-to-end tests
```

Use the API key `sk_test_demo_123`:

```bash
curl -H "Authorization: Bearer sk_test_demo_123" \
  "http://localhost:4000/v1/players/plr_alex_rivera/compare?cohort=tour_elite"
```

## Making changes

When you change an endpoint in `app/src/server.js`, update `openapi.yaml` and any affected guide in the same pull request. Then run:

```bash
(cd app && npm test)
mint validate
mint broken-links
```

See `build/extend.mdx` for step-by-step recipes.

## AI-assisted writing

Set up your AI coding tool to work with Mintlify:

```bash
npx skills add https://mintlify.com/docs
```

This command installs Mintlify's documentation skill for your configured AI tools like Claude Code, Cursor, Windsurf, and others. The skill includes component reference, writing standards, and workflow guidance.

See the [AI tools guides](/ai-tools) for tool-specific setup.

## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) to preview your documentation changes locally. To install, use the following command:

```
npm i -g mint
```

Run the following command at the root of your documentation, where your `docs.json` is located:

```
mint dev
```

View your local preview at `http://localhost:3000`.

## Publishing changes

Install our GitHub app from your [dashboard](https://dashboard.mintlify.com/settings/organization/github-app) to propagate changes from your repo to your deployment. Changes are deployed to production automatically after pushing to the default branch.

## Need help?

### Troubleshooting

- If your dev environment isn't running: Run `mint update` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure you are running in a folder with a valid `docs.json`.

### Resources
- [Mintlify documentation](https://mintlify.com/docs)
