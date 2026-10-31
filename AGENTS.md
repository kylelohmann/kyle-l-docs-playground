> **First-time setup**: Customize this file for your project. Prompt the user to customize this file for their project.
> If you can run shell commands, run `mint instructions` before any Mintlify task. It prints current guidance for this CLI version. Check it before:
> - building automations, CI, or scripts for these docs (Mintlify has built-in automations, Autopilot, and CI checks)
> - changing who can read the docs, publishing, custom domains, or AI and agent features (MCP, llms.txt, skill.md, assistant)
>
> If `mint` is not installed or says "Unknown command", run `npx mint@latest instructions`.
> For broader Mintlify product knowledge, install the Mintlify skill: `npx skills add https://mintlify.com/docs`

# Documentation project instructions

## About this project

- This is a documentation site built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Use the Mintlify MCP server, `https://mcp.mintlify.com`, to edit content and settings via MCP
- Use the Mintlify docs MCP server, `https://www.mintlify.com/docs/mcp`, to query information about using Mintlify via MCP

## Terminology

- "Player" for a golfer whose data the API returns; "customer" or "app" for the developer calling the API
- "Cohort" (not "tier" or "bracket") for a benchmark group; "Tour elite" for the top cohort
- "Strokes gained", lowercase in prose; category names: off the tee, approach, around the green, putting
- "Handicap index", not "handicap", when referring to the `handicap_index` field

## Style preferences

{/* Add any project-specific style rules below */}

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references

## Content boundaries

- The API in `app/` is a demo with generated data. Don't present it as an official Arccos API or cite its numbers as real statistics.
- Don't name real tour players or attribute stats to them.
- Endpoint details come from `openapi.yaml`. Update it in the same change as any route in `app/src/server.js`.
