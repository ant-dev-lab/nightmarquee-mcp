---
name: "nightmarquee-fieldnote"
description: "Fieldnote: A hand-drawn SaaS where the diagrams sketch themselves. A diagram notebook landing on cream paper: scroll scrubs a fountain pen finishing its ink line while a corner sketch draws itself in step with the film. Below it every illustration inks itself in as it enters view, margin notes ring a real product screen, and Nib, a small ink mascot, walks a drawn path that links each section down to a per-editor price you set yourself. Builds the NightMarquee \"Fieldnote\" page; live demo at https://nightmarquee.com/demo/fieldnote."
---

# Fieldnote

A hand-drawn SaaS where the diagrams sketch themselves. Live demo: https://nightmarquee.com/demo/fieldnote

A diagram notebook landing on cream paper: scroll scrubs a fountain pen finishing its ink line while a corner sketch draws itself in step with the film. Below it every illustration inks itself in as it enters view, margin notes ring a real product screen, and Nib, a small ink mascot, walks a drawn path that links each section down to a per-editor price you set yourself.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server (https://mcp.nightmarquee.com/mcp): `get_design(slug: "fieldnote", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's brand or site name, up to 24 characters.
- Without it: ask the person to open https://nightmarquee.com/p/fieldnote, choose their tool and copy the prompt. The page loads it in the browser, so fetching the page will not show it.

## Starter and footage

These need a connected NightMarquee account.

- Starter: `get_starter(slug: "fieldnote")`. `get_design`'s result has `starter.available`. If you cannot see it, call `get_starter` anyway; a `not_found` answer means there is none. It returns a download link that lasts ten minutes. The zip unpacks to `fieldnote-starter/`: run `npm install` and `npm run dev` inside it. Each account gets 5 starters a day, and asking again for the same one within ten minutes is not counted twice.
- Footage: `get_footage(slug: "fieldnote")`. The starter already plays the clips online, so download them only to work offline or to build from the prompt. Save each file into `public/drops/fieldnote/` under its `name`, while the links work (ten minutes); a starter then uses them when started with `NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev`. Skip the files named `*-original.mp4`: they are the large original masters, needed only to re-encode. Quote each link in the shell, since it contains `&`: `curl -fL --create-dirs -o public/drops/fieldnote/hero.mp4 "<url>"`.

## Install with shadcn

`npx shadcn@latest add @nightmarquee/fieldnote`. It needs no account and no key. It adds the design's files to the project the person is in.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
