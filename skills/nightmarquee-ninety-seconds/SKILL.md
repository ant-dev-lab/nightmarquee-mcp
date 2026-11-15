---
name: "nightmarquee-ninety-seconds"
description: "Ninety Seconds: A pizzeria whose page makes the pizza while you scroll. One Neapolitan pizza is made in the middle of the screen as you scroll: a floured ball opens into a round, tomato spirals out, fior di latte and basil fall in, and a stone oven rises around it. A readout gives the real number of each step, 72 hours for the dough and about 90 seconds at about 450 °C, and changes only when the picture does. At the end you drag the first slice off the board, the cheese stretching as far as you pull. Builds the NightMarquee \"Ninety Seconds\" page; live demo at https://nightmarquee.com/demo/ninety-seconds."
---

# Ninety Seconds

A pizzeria whose page makes the pizza while you scroll. Live demo: https://nightmarquee.com/demo/ninety-seconds

One Neapolitan pizza is made in the middle of the screen as you scroll: a floured ball opens into a round, tomato spirals out, fior di latte and basil fall in, and a stone oven rises around it. A readout gives the real number of each step, 72 hours for the dough and about 90 seconds at about 450 °C, and changes only when the picture does. At the end you drag the first slice off the board, the cheese stretching as far as you pull.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server (https://mcp.nightmarquee.com/mcp): `get_design(slug: "ninety-seconds", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's brand or site name, up to 24 characters.
- Without it: ask the person to open https://nightmarquee.com/p/ninety-seconds, choose their tool and copy the prompt. The page loads it in the browser, so fetching the page will not show it.

## Starter and footage

These need a connected NightMarquee account.

- Starter: `get_starter(slug: "ninety-seconds")`. `get_design`'s result has `starter.available`. If you cannot see it, call `get_starter` anyway; a `not_found` answer means there is none. It returns a download link that lasts ten minutes. The zip unpacks to `ninety-seconds-starter/`: run `npm install` and `npm run dev` inside it. Each account gets 5 starters a day, and asking again for the same one within ten minutes is not counted twice.
- Footage: `get_footage(slug: "ninety-seconds")`. The starter already plays the clips online, so download them only to work offline or to build from the prompt. Save each file into `public/drops/ninety-seconds/` under its `name`, while the links work (ten minutes); a starter then uses them when started with `NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev`. Skip the files named `*-original.mp4`: they are the large original masters, needed only to re-encode. Quote each link in the shell, since it contains `&`: `curl -fL --create-dirs -o public/drops/ninety-seconds/hero.mp4 "<url>"`.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
