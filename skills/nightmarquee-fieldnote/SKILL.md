---
name: "nightmarquee-fieldnote"
description: "Fieldnote: A hand-drawn SaaS where the diagrams sketch themselves. A diagram notebook landing on cream paper: scroll scrubs a fountain pen finishing its ink line while a corner sketch draws itself in step with the film. Below it every illustration inks itself in as it enters view, margin notes ring a real product screen, and Nib, a small ink mascot, walks a drawn path that links each section down to a per-editor price you set yourself. Builds the NightMarquee \"Fieldnote\" page; live demo at https://nightmarquee.com/demo/fieldnote."
---

# Fieldnote

A hand-drawn SaaS where the diagrams sketch themselves. Live demo: https://nightmarquee.com/demo/fieldnote

A diagram notebook landing on cream paper: scroll scrubs a fountain pen finishing its ink line while a corner sketch draws itself in step with the film. Below it every illustration inks itself in as it enters view, margin notes ring a real product screen, and Nib, a small ink mascot, walks a drawn path that links each section down to a per-editor price you set yourself.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server: `nightmarquee_get_prompt(slug: "fieldnote", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's own name.
- Without it: `curl -s "https://nightmarquee.com/api/mcp/prompt/fieldnote?tool=claude"` and use the `text` field.

## Footage

The demo's clips come with the prompt for anyone signed in to a free NightMarquee account, through the MCP server (`nightmarquee_sign_in`, then `nightmarquee_get_footage(slug: "fieldnote")`). Download each clip into `public/` under its name before building. Without them, follow the prompt's own footage steps.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
