---
name: "nightmarquee-sumi-atelier"
description: "Sumi Atelier: Every cursor stroke is an ink wash that never dries. An identity studio portfolio on warm rice paper: scroll pushes the camera into a pool of black sumi ink while three chapter cards land on their own seconds of the film. In the work index the cursor leaves a wash that pools wider where the brush rests, and choosing a project bleeds its plate in from the point you chose it, ending on a looping ink edge behind the commission form. Builds the NightMarquee \"Sumi Atelier\" page; live demo at https://nightmarquee.com/demo/sumi-atelier."
---

# Sumi Atelier

Every cursor stroke is an ink wash that never dries. Live demo: https://nightmarquee.com/demo/sumi-atelier

An identity studio portfolio on warm rice paper: scroll pushes the camera into a pool of black sumi ink while three chapter cards land on their own seconds of the film. In the work index the cursor leaves a wash that pools wider where the brush rests, and choosing a project bleeds its plate in from the point you chose it, ending on a looping ink edge behind the commission form.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server: `nightmarquee_get_prompt(slug: "sumi-atelier", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's own name.
- Without it: `curl -s "https://nightmarquee.com/api/mcp/prompt/sumi-atelier?tool=claude"` and use the `text` field.

## Footage

The demo's clips come with the prompt for anyone signed in to a free NightMarquee account, through the MCP server (`nightmarquee_sign_in`, then `nightmarquee_get_footage(slug: "sumi-atelier")`). Download each clip into `public/` under its name before building. Without them, follow the prompt's own footage steps.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
