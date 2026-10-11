---
name: "nightmarquee-lumen-observatory"
description: "Lumen Observatory: Deep-space observatory scene with parallax starfield and orbit lines. A 3D-feel hero without WebGL: three parallax star layers, elliptical orbit lines, and a brass-ringed planet that tilts toward your cursor. Scroll pulls you deeper into the field. Feels like a telescope UI from a kinder future. Builds the NightMarquee \"Lumen Observatory\" page; live demo at https://nightmarquee.com/demo/lumen-observatory."
---

# Lumen Observatory

Deep-space observatory scene with parallax starfield and orbit lines. Live demo: https://nightmarquee.com/demo/lumen-observatory

A 3D-feel hero without WebGL: three parallax star layers, elliptical orbit lines, and a brass-ringed planet that tilts toward your cursor. Scroll pulls you deeper into the field. Feels like a telescope UI from a kinder future.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server: `nightmarquee_get_prompt(slug: "lumen-observatory", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's own name.
- Without it: `curl -s "https://nightmarquee.com/api/mcp/prompt/lumen-observatory?tool=claude"` and use the `text` field.

## Footage

The demo's clips come with the prompt for anyone signed in to a free NightMarquee account, through the MCP server (`nightmarquee_sign_in`, then `nightmarquee_get_footage(slug: "lumen-observatory")`). Download each clip into `public/` under its name before building. Without them, follow the prompt's own footage steps.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
