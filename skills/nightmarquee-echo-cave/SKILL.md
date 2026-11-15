---
name: "nightmarquee-echo-cave"
description: "Echo Cave: A sound studio run by a bat with very good ears. A sound studio portfolio that opens on a clay bat in headphones hanging in front of its own wordmark. Click anywhere and rings of sonar spread from the pointer, lighting every project title they cross. The scroll flies past its ears into the cave studio, and the showreel cassette lands on the desk as the work index, where each track plays a 3 second sample only when pressed. Builds the NightMarquee \"Echo Cave\" page; live demo at https://nightmarquee.com/demo/echo-cave."
---

# Echo Cave

A sound studio run by a bat with very good ears. Live demo: https://nightmarquee.com/demo/echo-cave

A sound studio portfolio that opens on a clay bat in headphones hanging in front of its own wordmark. Click anywhere and rings of sonar spread from the pointer, lighting every project title they cross. The scroll flies past its ears into the cave studio, and the showreel cassette lands on the desk as the work index, where each track plays a 3 second sample only when pressed.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server (https://mcp.nightmarquee.com/mcp): `get_design(slug: "echo-cave", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's brand or site name, up to 24 characters.
- Without it: ask the person to open https://nightmarquee.com/p/echo-cave, choose their tool and copy the prompt. The page loads it in the browser, so fetching the page will not show it.

## Starter and footage

These need a connected NightMarquee account.

- Starter: `get_starter(slug: "echo-cave")`. `get_design`'s result has `starter.available`. If you cannot see it, call `get_starter` anyway; a `not_found` answer means there is none. It returns a download link that lasts ten minutes. The zip unpacks to `echo-cave-starter/`: run `npm install` and `npm run dev` inside it. Each account gets 5 starters a day, and asking again for the same one within ten minutes is not counted twice.
- Footage: `get_footage(slug: "echo-cave")`. The starter already plays the clips online, so download them only to work offline or to build from the prompt. Save each file into `public/drops/echo-cave/` under its `name`, while the links work (ten minutes); a starter then uses them when started with `NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev`. Skip the files named `*-original.mp4`: they are the large original masters, needed only to re-encode. Quote each link in the shell, since it contains `&`: `curl -fL --create-dirs -o public/drops/echo-cave/hero.mp4 "<url>"`.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
