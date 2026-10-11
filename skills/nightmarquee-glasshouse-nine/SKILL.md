---
name: "nightmarquee-glasshouse-nine"
description: "Glasshouse Nine: Walk into the glasshouse as you scroll. A nursery landing with an honest heartbeat: the hero drifts you through ferns and misted Victorian glass, the bench list shows live counts and keeps sold-out plants visible with their re-rooting dates, and pointing at any row floats a photo of the actual plant. Builds the NightMarquee \"Glasshouse Nine\" page; live demo at https://nightmarquee.com/demo/glasshouse-nine."
---

# Glasshouse Nine

Walk into the glasshouse as you scroll. Live demo: https://nightmarquee.com/demo/glasshouse-nine

A nursery landing with an honest heartbeat: the hero drifts you through ferns and misted Victorian glass, the bench list shows live counts and keeps sold-out plants visible with their re-rooting dates, and pointing at any row floats a photo of the actual plant.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server: `nightmarquee_get_prompt(slug: "glasshouse-nine", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's own name.
- Without it: `curl -s "https://nightmarquee.com/api/mcp/prompt/glasshouse-nine?tool=claude"` and use the `text` field.

## Footage

The demo's clips come with the prompt for anyone signed in to a free NightMarquee account, through the MCP server (`nightmarquee_sign_in`, then `nightmarquee_get_footage(slug: "glasshouse-nine")`). Download each clip into `public/` under its name before building. Without them, follow the prompt's own footage steps.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
