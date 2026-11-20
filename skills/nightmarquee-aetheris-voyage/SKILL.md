---
name: "nightmarquee-aetheris-voyage"
description: "Aetheris Voyage: Dream-travel hero with a slow ink-navy nebula and a coral dawn. A full-viewport hero for a fictional dream-travel brand. A conic-gradient nebula slowly rotates behind an ultra-wide, letter-spaced headline in moon-paper white, a faint coral dawn low on the horizon. Nav, headline and CTA stagger in on load. The scene feels weightless, like the site is drifting. Builds the NightMarquee \"Aetheris Voyage\" page; live demo at https://nightmarquee.com/demo/aetheris-voyage."
---

# Aetheris Voyage

Dream-travel hero with a slow ink-navy nebula and a coral dawn. Live demo: https://nightmarquee.com/demo/aetheris-voyage

A full-viewport hero for a fictional dream-travel brand. A conic-gradient nebula slowly rotates behind an ultra-wide, letter-spaced headline in moon-paper white, a faint coral dawn low on the horizon. Nav, headline and CTA stagger in on load. The scene feels weightless, like the site is drifting.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server (https://mcp.nightmarquee.com/mcp): `get_design(slug: "aetheris-voyage", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's brand or site name, up to 24 characters.
- Without it: ask the person to open https://nightmarquee.com/p/aetheris-voyage, choose their tool and copy the prompt. The page loads it in the browser, so fetching the page will not show it.

## Starter and footage

These need a connected NightMarquee account.

- Starter: `get_starter(slug: "aetheris-voyage")`. `get_design`'s result has `starter.available`. If you cannot see it, call `get_starter` anyway; a `not_found` answer means there is none. It returns a download link that lasts ten minutes. The zip unpacks to `aetheris-voyage-starter/`: run `npm install` and `npm run dev` inside it. Each account gets 5 starters a day, and asking again for the same one within ten minutes is not counted twice.
- Footage: `get_footage(slug: "aetheris-voyage")`. The starter already plays the clips online, so download them only to work offline or to build from the prompt. Save each file into `public/drops/aetheris-voyage/` under its `name`, while the links work (ten minutes); a starter then uses them when started with `NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev`. Skip the files named `*-original.mp4`: they are the large original masters, needed only to re-encode. Quote each link in the shell, since it contains `&`: `curl -fL --create-dirs -o public/drops/aetheris-voyage/hero.mp4 "<url>"`.

## Install with shadcn

`npx shadcn@latest add @nightmarquee/aetheris-voyage`. It needs no account and no key. It adds the design's files to the project the person is in.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
