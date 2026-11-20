---
name: "nightmarquee-lathe-lacquer"
description: "Lathe & Lacquer: A walnut bowl you turn, carve and lacquer with the scrollbar. A filmed gouge cuts a spinning walnut blank as you scroll, then a live three.js lathe takes over: the bowl's profile carves itself pass by pass and a coat of oxblood lacquer spreads across the grain. Drag to walk round it, then orbit 4 finished pieces on a turntable and price a commission. Builds the NightMarquee \"Lathe & Lacquer\" page; live demo at https://nightmarquee.com/demo/lathe-lacquer."
---

# Lathe & Lacquer

A walnut bowl you turn, carve and lacquer with the scrollbar. Live demo: https://nightmarquee.com/demo/lathe-lacquer

A filmed gouge cuts a spinning walnut blank as you scroll, then a live three.js lathe takes over: the bowl's profile carves itself pass by pass and a coat of oxblood lacquer spreads across the grain. Drag to walk round it, then orbit 4 finished pieces on a turntable and price a commission.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server (https://mcp.nightmarquee.com/mcp): `get_design(slug: "lathe-lacquer", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's brand or site name, up to 24 characters.
- Without it: ask the person to open https://nightmarquee.com/p/lathe-lacquer, choose their tool and copy the prompt. The page loads it in the browser, so fetching the page will not show it.

## Starter and footage

These need a connected NightMarquee account.

- Starter: `get_starter(slug: "lathe-lacquer")`. `get_design`'s result has `starter.available`. If you cannot see it, call `get_starter` anyway; a `not_found` answer means there is none. It returns a download link that lasts ten minutes. The zip unpacks to `lathe-lacquer-starter/`: run `npm install` and `npm run dev` inside it. Each account gets 5 starters a day, and asking again for the same one within ten minutes is not counted twice.
- Footage: `get_footage(slug: "lathe-lacquer")`. The starter already plays the clips online, so download them only to work offline or to build from the prompt. Save each file into `public/drops/lathe-lacquer/` under its `name`, while the links work (ten minutes); a starter then uses them when started with `NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev`. Skip the files named `*-original.mp4`: they are the large original masters, needed only to re-encode. Quote each link in the shell, since it contains `&`: `curl -fL --create-dirs -o public/drops/lathe-lacquer/hero.mp4 "<url>"`.

## Install with shadcn

`npx shadcn@latest add @nightmarquee/lathe-lacquer`. It needs no account and no key. It adds the design's files to the project the person is in.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
