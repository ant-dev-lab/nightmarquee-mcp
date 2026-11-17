---
name: "nightmarquee"
description: "Build cinematic, art-directed websites and apps from NightMarquee designs: 85 builds (ecommerce, landing, portfolio, saas, hero, 3d, mobile, dashboard), each with a live demo, a build prompt, a runnable starter for many, and the footage the demos play. Use when someone asks for a cinematic landing page, a hero section, a scroll-driven video site, a 3D or WebGL page, or a page like a NightMarquee demo."
---

# NightMarquee

NightMarquee is a library of cinematic website and app designs. Every design has a live demo at https://nightmarquee.com/demo/<slug> and a build prompt; many have a runnable Next.js starter, and the demos' clips and images come with an account.

## With the MCP server (preferred)

Add the remote server once:

- Claude Code: `claude mcp add --transport http nightmarquee https://mcp.nightmarquee.com/mcp`
- Codex: `codex mcp add nightmarquee --url https://mcp.nightmarquee.com/mcp`
- Claude, ChatGPT, Cursor or VS Code: the steps and buttons on https://nightmarquee.com/mcp
- A tool that cannot add a remote address: the older local server, `npx -y nightmarquee`. It has a different set of tools, so these steps do not apply to it.

Then:

1. `search_designs` with a query, a category or `tier: "free"`. Show the person the demo links and let them pick.
2. `get_design(slug, tool, brand)`. Pass `tool` for the editor you are in (lovable, bolt, cursor, claude or codex) and `brand` for their brand or site name, up to 24 characters.
3. In a shell, when the person wants to run a starter: `get_design`'s result has `starter.available`. If you cannot see it, call `get_starter` anyway; a `not_found` answer means there is none. `get_starter(slug)` returns a download link that lasts ten minutes. The zip unpacks to `<slug>-starter/`: run `npm install` and `npm run dev` inside it. Each account gets 5 starters a day, and asking again for the same one within ten minutes is not counted twice.
4. For the demo's clips and images: `get_footage(slug)`. The starter already plays the clips online, so download them only to work offline or to build from the prompt. Save each file into `public/drops/<slug>/` under its `name`, while the links work (ten minutes); a starter then uses them when started with `NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev`. Skip the files named `*-original.mp4`: they are the large original masters, needed only to re-encode. Quote each link in the shell, since it contains `&`: `curl -fL --create-dirs -o public/drops/<slug>/hero.mp4 "<url>"`.
5. Build the page the prompt describes, or adapt the starter, then compare it with the demo.

## What next

Each of these is its own skill:

- `nightmarquee-build`: from what the person wants to a chosen design and its prompt.
- `nightmarquee-run-locally`: download a starter and run it on this computer.
- `nightmarquee-make-it-mine`: their own name, words, colours, fonts and clips in a starter.
- `nightmarquee-put-online`: a private git repo, Vercel, or both.
- `nightmarquee-ai-look-test`: check a site for the AI look and fix what the check finds.

Free designs need no account. Starters and footage need a connected account, and paid designs need a plan. A tool that needs an account says so, and your MCP client opens the sign-in; if it does not, connect NightMarquee from the client's MCP settings.

## Without the MCP server

Free designs are open on their pages: ask the person to open https://nightmarquee.com/p/<slug>, choose their tool and copy the prompt. The page loads it in the browser, so fetching the page will not show it. The free ones today: `ninety-seconds`, `side-eye`, `echo-cave`, `jacquard-hall`, `snail-courier`, `lathe-lacquer`, `leaf-assay`, `ternary-systems`, `fieldnote`, `sumi-atelier`, `wren`, `glasshouse-nine`, `aetheris-voyage`, `nordlys-fintech`, `solstice-festival`, `lumen-observatory`. A signed-in person can also download starters and footage on the design's page.
