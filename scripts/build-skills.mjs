#!/usr/bin/env node
/**
 * Builds the skills that `npx skills add nightmarquee/nightmarquee-mcp`
 * installs: one guide to the whole catalog, and one per free prompt. They are
 * written from the live catalog and carry no prompt text: each tells the agent
 * how to fetch the current prompt, so a copy on GitHub can never go stale or
 * leak a paid body.
 *
 * Usage: node scripts/build-skills.mjs [outDir]   (default: the package root)
 * Writes <outDir>/skills/<name>/SKILL.md and removes skills no longer listed.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://nightmarquee.com";
const REMOTE = "https://mcp.nightmarquee.com/mcp";

/** A YAML double-quoted scalar; JSON string escapes are valid YAML. */
const q = (value) => JSON.stringify(value);

function skill(name, description, body) {
  return {
    path: `skills/${name}/SKILL.md`,
    content: `---\nname: ${q(name)}\ndescription: ${q(description)}\n---\n\n${body.trim()}\n`,
  };
}

function guide(catalog) {
  const free = catalog.prompts.filter((p) => p.tier === "free");
  const categories = [...new Set(catalog.prompts.map((p) => p.category))].join(", ");
  return skill(
    "nightmarquee",
    `Build cinematic, art-directed websites and apps from NightMarquee designs: ${catalog.prompts.length} builds (${categories}), each with a live demo, a build prompt, a runnable starter for many, and the footage the demos play. Use when someone asks for a cinematic landing page, a hero section, a scroll-driven video site, a 3D or WebGL page, or a page like a NightMarquee demo.`,
    `
# NightMarquee

NightMarquee is a library of cinematic website and app designs. Every design has a live demo at ${SITE}/demo/<slug> and a build prompt; many have a runnable Next.js starter, and the demos' clips and images come with an account.

## With the MCP server (preferred)

Add the remote server once:

- Claude Code: \`claude mcp add --transport http nightmarquee ${REMOTE}\`
- Codex: \`codex mcp add nightmarquee --url ${REMOTE}\`
- Claude, ChatGPT, Cursor or VS Code: the steps and buttons on ${SITE}/mcp
- A tool that cannot add a remote address: the older local server, \`npx -y nightmarquee\`. It has a different set of tools, so these steps do not apply to it.

Then:

1. \`search_designs\` with a query, a category or \`tier: "free"\`. Show the person the demo links and let them pick.
2. \`get_design(slug, tool, brand)\`. Pass \`tool\` for the editor you are in (lovable, bolt, cursor, claude or codex) and \`brand\` for their brand or site name, up to 24 characters.
3. ${STARTER_STEP}
4. ${FOOTAGE_STEP("<slug>")}
5. Build the page the prompt describes, or adapt the starter, then compare it with the demo.

Free designs need no account. Starters and footage need a connected account, and paid designs need a plan. A tool that needs an account says so, and your MCP client opens the sign-in; if it does not, connect NightMarquee from the client's MCP settings.

## Without the MCP server

Free designs are open on their pages: ask the person to open ${SITE}/p/<slug>, choose their tool and copy the prompt. The page loads it in the browser, so fetching the page will not show it. The free ones today: ${free.map((p) => `\`${p.slug}\``).join(", ")}. A signed-in person can also download starters and footage on the design's page.
`
  );
}

/** Step 3 of the guide, and the starter line of a design's skill. */
const STARTER_STEP =
  "In a shell, when the person wants to run a starter: `get_design`'s result has `starter.available`. If you cannot see it, call `get_starter` anyway; a `not_found` answer means there is none. `get_starter(slug)` returns a download link that lasts ten minutes. The zip unpacks to `<slug>-starter/`: run `npm install` and `npm run dev` inside it. Each account gets 5 starters a day, and asking again for the same one within ten minutes is not counted twice.";

/** Footage: where the starter and the prompt read it, without the large masters. */
const FOOTAGE_STEP = (slug) =>
  `For the demo's clips and images: \`get_footage(slug)\`. The starter already plays the clips online, so download them only to work offline or to build from the prompt. Save each file into \`public/drops/${slug}/\` under its \`name\`, while the links work (ten minutes); a starter then uses them when started with \`NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev\`. Skip the files named \`*-original.mp4\`: they are the large original masters, needed only to re-encode. Quote each link in the shell, since it contains \`&\`: \`curl -fL --create-dirs -o public/drops/${slug}/hero.mp4 "<url>"\`.`;

function freePrompt(p) {
  const page = p.pageUrl ?? `${SITE}/p/${p.slug}`;
  return skill(
    `nightmarquee-${p.slug}`,
    `${p.title}: ${p.tagline}. ${p.description} Builds the NightMarquee "${p.title}" page; live demo at ${p.demoUrl}.`,
    `
# ${p.title}

${p.tagline}. Live demo: ${p.demoUrl}

${p.description}

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server (${REMOTE}): \`get_design(slug: "${p.slug}", tool: "claude")\`. Pass the \`tool\` for the editor you are in (lovable, bolt, cursor, claude or codex) and \`brand\` for the person's brand or site name, up to 24 characters.
- Without it: ask the person to open ${page}, choose their tool and copy the prompt. The page loads it in the browser, so fetching the page will not show it.

## Starter and footage

These need a connected NightMarquee account.

- Starter: \`get_starter(slug: "${p.slug}")\`. ${STARTER_STEP.replace("In a shell, when the person wants to run a starter: ", "").replaceAll("<slug>", p.slug).replace("`get_starter(slug)` returns", "It returns")}
- Footage: \`get_footage(slug: "${p.slug}")\`. ${FOOTAGE_STEP(p.slug).replace("For the demo's clips and images: `get_footage(slug)`. ", "")}

Build the page, then compare it with the demo. Prompt licence: ${SITE}/license
`
  );
}

/** Every skill the catalog implies, as { path, content }. Pure, for tests. */
export function buildSkills(catalog) {
  return [guide(catalog), ...catalog.prompts.filter((p) => p.tier === "free").map(freePrompt)];
}

async function main() {
  const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const out = resolve(process.argv[2] ?? pkgRoot);
  const res = await fetch(`${process.env.NIGHTMARQUEE_API ?? SITE}/api/mcp/catalog`);
  if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`);
  const skills = buildSkills(await res.json());

  const keep = new Set(skills.map((s) => s.path.split("/")[1]));
  const dir = join(out, "skills");
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    if (!keep.has(name)) rmSync(join(dir, name), { recursive: true });
  }
  for (const { path, content } of skills) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), content);
  }
  console.log(`wrote ${skills.length} skills to ${dir}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
