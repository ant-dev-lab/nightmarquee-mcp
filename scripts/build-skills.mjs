#!/usr/bin/env node
/**
 * Builds the skills that `npx skills add ant-dev-lab/nightmarquee-mcp`
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
    `Build cinematic, art-directed websites from NightMarquee prompts: ${catalog.prompts.length} builds (${categories}), each with a live demo, plus the footage the demos play for signed-in accounts. Use when someone asks for a cinematic landing page, a hero section, a scroll-driven video site, a 3D or WebGL page, or a page like a NightMarquee demo.`,
    `
# NightMarquee

NightMarquee is a catalog of website and mobile app build prompts. Every prompt has a live demo at ${SITE}/demo/<slug>, and most demos play footage, which comes with the prompt for signed-in accounts.

## With the MCP server (preferred)

Install it once:

- Claude Code: \`claude mcp add nightmarquee -- npx -y nightmarquee\`
- Codex: \`codex mcp add nightmarquee -- npx -y nightmarquee\`
- Cursor or Claude Desktop: add \`{ "command": "npx", "args": ["-y", "nightmarquee"] }\` under \`mcpServers\`

Then:

1. \`nightmarquee_search_prompts\` with a query, category or \`tier: "free"\`. Show the person the demo links and let them pick.
2. \`nightmarquee_get_prompt(slug, tool, brand)\`. Pass \`tool\` for the editor you are in and \`brand\` for their name.
3. If the result has \`footage\`, download each clip into \`public/\` under its \`name\` before building, while the links work (ten minutes). Quote each link in the shell, since it contains \`&\`: \`curl -fL --create-dirs -o public/hero.mp4 "<url>"\`. If the links expired, \`nightmarquee_get_footage(slug)\` returns fresh ones.
4. Build the page the prompt describes, then compare it with the demo.

A free prompt's footage needs a free account and the rest need Unlimited: run \`nightmarquee_sign_in\` and the person approves a short code in the browser.

## Without the MCP server

Free prompts are open:

- Catalog: \`curl -s ${SITE}/api/mcp/catalog\`
- One prompt: \`curl -s "${SITE}/api/mcp/prompt/<slug>?tool=claude"\`, then use the \`text\` field.

The free ones today: ${free.map((p) => `\`${p.slug}\``).join(", ")}. Paid prompts and all footage need the MCP server and an account.
`
  );
}

function freePrompt(p) {
  return skill(
    `nightmarquee-${p.slug}`,
    `${p.title}: ${p.tagline}. ${p.description} Builds the NightMarquee "${p.title}" page; live demo at ${p.demoUrl}.`,
    `
# ${p.title}

${p.tagline}. Live demo: ${p.demoUrl}

${p.description}

## Get the prompt

The prompt is kept current on nightmarquee.com, so fetch it rather than writing the page from this summary.

- With the NightMarquee MCP server: \`nightmarquee_get_prompt(slug: "${p.slug}", tool: "claude")\`. Pass the \`tool\` for the editor you are in (lovable, bolt, cursor, claude or codex) and \`brand\` for the person's own name.
- Without it: \`curl -s "${SITE}/api/mcp/prompt/${p.slug}?tool=claude"\` and use the \`text\` field.

## Footage

The demo's clips come with the prompt for anyone signed in to a free NightMarquee account, through the MCP server (\`nightmarquee_sign_in\`, then \`nightmarquee_get_footage(slug: "${p.slug}")\`). Download each clip into \`public/\` under its name before building. Without them, follow the prompt's own footage steps.

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
