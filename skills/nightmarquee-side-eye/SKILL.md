---
name: "nightmarquee-side-eye"
description: "Side Eye: Jumpers made from the wool of someone with opinions. A knitwear shop on a tomato red ground where a cream baby alpaca turns her head to keep your cursor in view, or your finger on a phone. Pick one of four jumper colours and she answers in a speech bubble, from a slow blink for oatmeal to a full turn away for bright green. The label names the animal, the herd and the farm. Builds the NightMarquee \"Side Eye\" page; live demo at https://nightmarquee.com/demo/side-eye."
---

# Side Eye

Jumpers made from the wool of someone with opinions. Live demo: https://nightmarquee.com/demo/side-eye

A knitwear shop on a tomato red ground where a cream baby alpaca turns her head to keep your cursor in view, or your finger on a phone. Pick one of four jumper colours and she answers in a speech bubble, from a slow blink for oatmeal to a full turn away for bright green. The label names the animal, the herd and the farm.

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server (https://mcp.nightmarquee.com/mcp): `get_design(slug: "side-eye", tool: "claude")`. Pass the `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for the person's brand or site name, up to 24 characters.
- Without it: ask the person to open https://nightmarquee.com/p/side-eye, choose their tool and copy the prompt. The page loads it in the browser, so fetching the page will not show it.

## Starter and footage

These need a connected NightMarquee account.

- Starter: `get_starter(slug: "side-eye")`. `get_design`'s result has `starter.available`. If you cannot see it, call `get_starter` anyway; a `not_found` answer means there is none. It returns a download link that lasts ten minutes. The zip unpacks to `side-eye-starter/`: run `npm install` and `npm run dev` inside it. Each account gets 5 starters a day, and asking again for the same one within ten minutes is not counted twice.
- Footage: `get_footage(slug: "side-eye")`. The starter already plays the clips online, so download them only to work offline or to build from the prompt. Save each file into `public/drops/side-eye/` under its `name`, while the links work (ten minutes); a starter then uses them when started with `NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev`. Skip the files named `*-original.mp4`: they are the large original masters, needed only to re-encode. Quote each link in the shell, since it contains `&`: `curl -fL --create-dirs -o public/drops/side-eye/hero.mp4 "<url>"`.

Build the page, then compare it with the demo. Prompt licence: https://nightmarquee.com/license
