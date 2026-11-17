---
name: "nightmarquee-make-it-mine"
description: "Make a NightMarquee starter your own: a map of where the brand name, copy, colours, fonts, sections and clips live, and the steps to put in your own words, images and clips without breaking the design's motion. Use when someone wants to rebrand, restyle or change the text, colours, fonts or footage of a starter they have downloaded."
---

# Make a starter yours

This skill changes a downloaded starter with the person's own words and files: brand name, copy, colours, fonts, sections, and their own images or clips in place of ours. It needs a shell and the starter folder, `<slug>-starter/`. Putting the person's own product into the design's footage is a studio feature on nightmarquee.com; this skill does not make images or clips.

## Where things live

Paths are inside `<slug>-starter/`.

- `app/<slug>/demo.tsx`: the design itself, start here. The brand name, every line of copy, the sections in order, colour values and which clip plays where. Files beside it in `app/<slug>/` hold parts it imports.
- `app/page.tsx`: the page title and description.
- `app/layout.tsx`: the fonts the page loads, from `@fontsource` packages. The demo may import more of its own.
- `app/globals.css`: the design tokens (colours, font variables) and utilities.
- `lib/media-manifest.json`: the clips the page plays, each as `/drops/<slug>/<name>`.
- `.gitignore` and `next.config.ts`: see "Their own images and clips".

## Words, colours, fonts and sections

1. Ask for the brand name and the copy, or what to write. Search `app/` for the design's title and replace it. Keep the length of each line close to the original, since the layout is set for it.
2. Colours: change the values in `app/globals.css` and the ones in `app/<slug>/demo.tsx`. Keep text readable on its background.
3. Fonts: `npm install` the `@fontsource` package for the new face and import it where the old one is imported.
4. Sections: remove or reorder whole blocks in `app/<slug>/demo.tsx`. Do not remove a block that another one reads from.
5. Run `npm run lint` and `npm run typecheck`, then look at the page beside the demo.

## Their own images and clips

The design's motion keeps working when each file matches the one it replaces:

- Same name, same folder: `public/drops/<slug>/`. Use `get_footage` with the slug to see each file's `name`, `width`, `height`, `seconds` and `bytes`.
- Clips: MP4 with H.264 video, no sound needed (they play muted), the same aspect ratio as ours since the player crops to fill, and a similar length. Keep the file size near ours.
- A clip the page scrubs with scroll (the code sets `currentTime`) needs a keyframe every few frames, or seeking stutters. If ffmpeg is installed: `ffmpeg -i in.mp4 -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 22 -g 8 -keyint_min 8 -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart -an out.mp4`, with the width of our clip in place of 1280.
- Images and posters: the same format as the file they replace (`.jpg` stays `.jpg`).

Put the files in place:

1. For each file of their own in that folder, image or clip, add one line to `.gitignore` below `public/drops/<slug>/*` and `!public/drops/<slug>/.gitkeep`: `!public/drops/<slug>/<their file>`, such as `!public/drops/<slug>/hero.mp4`. Keep both lines, so the files of ours they downloaded stay out of the repo. Without its line, their file stays out of the repo and the deployed site shows ours.
2. Images and posters: put their file in `public/drops/<slug>/` under the same name. A local file wins over the rewrite in `next.config.ts`, which serves ours only where no local file exists.
3. To swap one clip, put their file in `public/drops/<slug>/` under the same name and delete only that clip's entry from `lib/media-manifest.json`. That clip then plays from the folder, and the rest keep streaming from https://media.nightmarquee.com with nothing else to set. A design with no clips has no `lib/media-manifest.json`.
4. Only when they replace every clip, they can switch the whole starter to local media instead: start with `NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev`, or put `NEXT_PUBLIC_FOOTAGE_LOCAL=1` in `.env.local`. Every clip in `lib/media-manifest.json` then plays from the folder, so each needs a file there.

## In a chat host

In a chat host with no shell, give the person the map above and the steps as text, to follow in their own editor, and stop.

## Next

- `nightmarquee-ai-look-test`: check the page for the AI look and fix it. Offer it now.
- `nightmarquee-put-online`: put the site online. If the starter uses `NEXT_PUBLIC_FOOTAGE_LOCAL=1`, it sets it on Vercel too.
