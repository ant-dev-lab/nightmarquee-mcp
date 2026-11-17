---
name: "nightmarquee-build"
description: "Start a website from a NightMarquee design: searches the library with the person's own words (a portfolio, a restaurant site, a product launch), lets them pick, then gets the build prompt for their coding tool and brand, and offers the runnable starter only when the design has one. Use when someone asks for a website, a landing page or a cinematic site and has not chosen a design yet."
---

# Build from a NightMarquee design

This skill takes someone from "I want a portfolio site" to a chosen design and its build prompt. It needs the NightMarquee MCP server (https://mcp.nightmarquee.com/mcp).

## Steps

1. `search_designs` with the person's own words as `query`, such as "portfolio" or "restaurant". Add `tier: "free"` if they want free designs only. If nothing matches, try one broader word or a category once, then ask them.
2. Let them pick. Where the host shows the design picker, it already has the posters, clips and demo links: ask which one they like. Otherwise list each design with its title, free or paid, and its demo link (https://nightmarquee.com/demo/<slug>). Do not pick for them.
3. `get_design` with `slug`, `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for their brand or site name, up to 24 characters. A paid design needs a connected account with a plan; if the tool refuses, tell them in its words.
4. Read `starter.available` in the result.
   - If it is true and you can run shell commands, offer to run the starter on their computer with the `nightmarquee-run-locally` skill.
   - If `starter.available` is false, build from the prompt and do not offer a starter.
5. To build from the prompt, follow it in this project. For the demo's clips and images, `get_footage` with the slug, as the `nightmarquee` skill describes. Then compare the page with the demo.

## In a chat host

In a chat host with no shell, give the person the prompt to paste into their builder, with the demo link, and stop. A signed-in person can download a starter on https://nightmarquee.com/p/<slug> when the design has one.

## Next

- `nightmarquee-make-it-mine`: their own name, words, colours, fonts and clips.
- `nightmarquee-ai-look-test`: check the page for the AI look and fix it.
- `nightmarquee-put-online`: put the site online.
