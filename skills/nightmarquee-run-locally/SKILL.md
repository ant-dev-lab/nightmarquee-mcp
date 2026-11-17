---
name: "nightmarquee-run-locally"
description: "Download a NightMarquee starter and run it on this computer: gets the starter link, downloads and unzips it, installs, reports npm audit's critical and high advisories, and starts the dev server. Use when someone wants to run, try or open a NightMarquee starter locally, or after choosing a design that has one."
---

# Run a starter locally

A starter is the design's demo as a Next.js app. This skill needs a shell, Node.js 20.9 or newer, and a connected NightMarquee account. Each account gets 5 starters a day.

In PowerShell, write `curl.exe` where these steps say `curl` (plain `curl` there is a different command), unzip with `Expand-Archive <slug>-starter.zip -DestinationPath . -Force`, and set a variable with `$env:NAME="1"` before the command that reads it.

## Steps

1. `get_starter` with the design's `slug`. It answers a download link, `file.url`, that lasts ten minutes. A `not_found` answer means the design has no starter: build from the prompt with the `nightmarquee-build` skill instead.
2. Download it with one command, the link in double quotes since it contains `&`: `curl -fL "<url>" -o <slug>-starter.zip`
3. Unzip it: `unzip -oq <slug>-starter.zip`. It unpacks to `<slug>-starter/`, replacing the files of an earlier try. Then `cd <slug>-starter`.
4. `npm install`.
5. `npm audit --audit-level=high`. Report each critical or high advisory: the package, its severity and the advisory link. Do not run npm audit fix unless the user asks.
6. `npm run dev`, and wait for the line with the local address (usually http://localhost:3000). If the dev server exits on its first start, start it once more. If it exits again, show its last lines and stop.
7. Open the address, or give it to the person. The clips and images play from media.nightmarquee.com, so the page works before anything else is downloaded.

## When the download fails

The link lasts ten minutes. If `curl` fails (often a 404), or the file will not unzip, the link has most likely expired: call `get_starter` again. Asking again for the same starter within ten minutes is not counted twice; later, it counts as another of the day's 5.

## Footage on this computer (optional)

To work offline, `get_footage` with the slug and save each file into `public/drops/<slug>/` under its `name`, skipping the `*-original.mp4` masters, as the `nightmarquee` skill describes. Then start with `NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev`.

## In a chat host

In a chat host with no shell, tell the person they can download the starter on https://nightmarquee.com/p/<slug> once signed in, unzip it, and run `npm install` and `npm run dev` in the folder. Then stop.

## Next

- `nightmarquee-make-it-mine`: their own name, words, colours, fonts and clips.
- `nightmarquee-put-online`: put the site online.
