---
name: "nightmarquee"
description: "Build cinematic, art-directed websites from NightMarquee prompts: 45 builds (landing, hero, ecommerce, portfolio, saas, 3d, mobile), each with a live demo, plus the footage the demos play for signed-in accounts. Use when someone asks for a cinematic landing page, a hero section, a scroll-driven video site, a 3D or WebGL page, or a page like a NightMarquee demo."
---

# NightMarquee

NightMarquee is a catalog of website and mobile app build prompts. Every prompt has a live demo at https://nightmarquee.com/demo/<slug>, and most demos play footage, which comes with the prompt for signed-in accounts.

## With the MCP server (preferred)

Install it once:

- Claude Code: `claude mcp add nightmarquee -- npx -y nightmarquee`
- Codex: `codex mcp add nightmarquee -- npx -y nightmarquee`
- Cursor or Claude Desktop: add `{ "command": "npx", "args": ["-y", "nightmarquee"] }` under `mcpServers`

Then:

1. `nightmarquee_search_prompts` with a query, category or `tier: "free"`. Show the person the demo links and let them pick.
2. `nightmarquee_get_prompt(slug, tool, brand)`. Pass `tool` for the editor you are in and `brand` for their name.
3. If the result has `footage`, download each clip into `public/` under its `name` before building, while the links work (ten minutes). Quote each link in the shell, since it contains `&`: `curl -fL --create-dirs -o public/hero.mp4 "<url>"`. If the links expired, `nightmarquee_get_footage(slug)` returns fresh ones.
4. Build the page the prompt describes, then compare it with the demo.

A free prompt's footage needs a free account and the rest need Unlimited: run `nightmarquee_sign_in` and the person approves a short code in the browser.

## Without the MCP server

Free prompts are open:

- Catalog: `curl -s https://nightmarquee.com/api/mcp/catalog`
- One prompt: `curl -s "https://nightmarquee.com/api/mcp/prompt/<slug>?tool=claude"`, then use the `text` field.

The free ones today: `fieldnote`, `sumi-atelier`, `wren`, `glasshouse-nine`, `aetheris-voyage`, `nordlys-fintech`, `solstice-festival`, `lumen-observatory`. Paid prompts and all footage need the MCP server and an account.
