---
name: "nightmarquee-wren"
description: "Wren: The companion app for a robot that lives with you. A home-robot app that feels like hardware: a live camera card that tags what the robot sees, a voice orb that turns a sentence into a queued task, a CSS-3D floor plan you spin with a finger while the robot re-plans around a toy, and teach-by-demonstration with a projected 3D skeleton. Ships inside a scroll tour where the phone swings between chapters over the footage. Builds the NightMarquee \"Wren\" page; live demo at https://nightmarquee.com/demo/wren."
---

# Wren

The companion app for a robot that lives with you. Live demo: https://nightmarquee.com/demo/wren

A home-robot app that feels like hardware: a live camera card that tags what the robot sees, a voice orb that turns a sentence into a queued task, a CSS-3D floor plan you spin with a finger while the robot re-plans around a toy, and teach-by-demonstration with a projected 3D skeleton. Ships inside a scroll tour where the phone swings between chapters over the footage.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server: `nightmarquee_get_prompt(slug: "wren", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's own name.
- Without it: `curl -s "https://nightmarquee.com/api/mcp/prompt/wren?tool=claude"` and use the `text` field.

## Footage

The demo's clips come with the prompt for anyone signed in to a free NightMarquee account, through the MCP server (`nightmarquee_sign_in`, then `nightmarquee_get_footage(slug: "wren")`). Download each clip into `public/` under its name before building. Without them, follow the prompt's own footage steps.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
