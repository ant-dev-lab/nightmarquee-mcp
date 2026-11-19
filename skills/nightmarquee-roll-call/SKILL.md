---
name: "nightmarquee-roll-call"
description: "Roll Call: An ice cream cart's page that rolls you one cup as you scroll. A frozen steel plate on a cobalt counter makes one cup of dragon fruit and mango rolled ice cream as you scroll: the pour, the fruit, the chop, the sheet, six rolls, the cup and the toppings. A corner readout gives the plate at -25 °C and the time the cream has been on it, changing only when the picture does. Once the cup is topped, a tap anywhere throws its toppings. Builds the NightMarquee \"Roll Call\" page; live demo at https://nightmarquee.com/demo/roll-call."
---

# Roll Call

An ice cream cart's page that rolls you one cup as you scroll. Live demo: https://nightmarquee.com/demo/roll-call

A frozen steel plate on a cobalt counter makes one cup of dragon fruit and mango rolled ice cream as you scroll: the pour, the fruit, the chop, the sheet, six rolls, the cup and the toppings. A corner readout gives the plate at -25 °C and the time the cream has been on it, changing only when the picture does. Once the cup is topped, a tap anywhere throws its toppings.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server (https://mcp.nightmarquee.com/mcp): `get_design(slug: "roll-call", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's brand or site name, up to 24 characters.
- Without it: ask the person to open https://nightmarquee.com/p/roll-call, choose their tool and copy the prompt. The page loads it in the browser, so fetching the page will not show it.

## Starter and footage

These need a connected NightMarquee account.

- Starter: `get_starter(slug: "roll-call")`. `get_design`'s result has `starter.available`. If you cannot see it, call `get_starter` anyway; a `not_found` answer means there is none. It returns a download link that lasts ten minutes. The zip unpacks to `roll-call-starter/`: run `npm install` and `npm run dev` inside it. Each account gets 5 starters a day, and asking again for the same one within ten minutes is not counted twice.
- Footage: `get_footage(slug: "roll-call")`. The starter already plays the clips online, so download them only to work offline or to build from the prompt. Save each file into `public/drops/roll-call/` under its `name`, while the links work (ten minutes); a starter then uses them when started with `NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev`. Skip the files named `*-original.mp4`: they are the large original masters, needed only to re-encode. Quote each link in the shell, since it contains `&`: `curl -fL --create-dirs -o public/drops/roll-call/hero.mp4 "<url>"`.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
