#!/usr/bin/env node
/**
 * Builds the manifests the directories read from the public plugin repo
 * (nightmarquee/nightmarquee-mcp), so they are generated from this package
 * like the skills and never edited by hand (spec R32). Every manifest points
 * at the remote address only and carries the shared name, one line and
 * description from docs/marketing/2026-11-12-mcp-listing-updates.md. The
 * formats, with the vendor pages they came from, are in section 2 of
 * docs/marketing/2026-11-17-mcp-submissions.md.
 *
 * Usage: node scripts/build-manifests.mjs <outDir> [--dry-run]
 * Writes the manifests into <outDir> and deletes nothing. The out dir must be
 * this package or the plugin repo (the same guard as build-skills.mjs).
 * --dry-run prints what it would write, and changes nothing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import PKG from "../package.json" with { type: "json" };
import { checkOutDir } from "./build-skills.mjs";

const REMOTE = "https://mcp.nightmarquee.com/mcp";
const SITE = "https://nightmarquee.com";
const REPO = "https://github.com/nightmarquee/nightmarquee-mcp";
const SERVER = "nightmarquee";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LISTING_DOC = resolve(PKG_ROOT, "..", "..", "docs", "marketing", "2026-11-12-mcp-listing-updates.md");

const LINKS = {
  homepage: `${SITE}/mcp`,
  support: `${REPO}/issues`,
  privacy: `${SITE}/privacy`,
  terms: `${SITE}/terms`,
};
const KEYWORDS = ["mcp", "design", "website", "prompts", "frontend", "landing-page", "animation"];
const ICON = "./icon.png";

/**
 * The shared blocks from the listing doc's "Shared text" section: the bullets
 * `- **Name:**`, `- **One line:**`, `- **Short line:**` and `- **Description:**`.
 * A missing block stops the build, so no manifest ships with a blank field.
 */
export function parseListing(markdown) {
  const start = markdown.indexOf("## Shared text");
  if (start < 0) throw new Error("listing doc has no '## Shared text' section");
  const rest = markdown.slice(start + 1);
  const end = rest.indexOf("\n## ");
  const section = end < 0 ? rest : rest.slice(0, end);
  const field = (label) => {
    const match = section.match(new RegExp(`^- \\*\\*${label}:\\*\\* (.+)$`, "m"));
    if (!match) throw new Error(`listing doc's Shared text has no '${label}' line`);
    return match[1].trim();
  };
  return {
    name: field("Name"),
    oneLine: field("One line"),
    shortLine: field("Short line"),
    description: field("Description"),
  };
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const servers = (entry) => ({ mcpServers: { [SERVER]: entry } });

/** One `{ path, content }` per manifest a directory reads, in the shape that directory documents. */
export function buildManifests(listing) {
  const slug = listing.name.toLowerCase();
  const about = `${listing.oneLine} ${listing.description}`;
  const author = { name: listing.name, email: "support@nightmarquee.com", url: SITE };
  const common = {
    name: slug,
    version: PKG.version,
    description: about,
    author,
    homepage: LINKS.homepage,
    repository: REPO,
    license: PKG.license,
    keywords: KEYWORDS,
  };

  return [
    // Claude Code and the Claude plugin directory. The server comes from .mcp.json.
    {
      path: ".claude-plugin/plugin.json",
      content: json({
        name: slug,
        displayName: listing.name,
        ...common,
        icon: ICON,
        documentationUrl: LINKS.homepage,
        supportUrl: LINKS.support,
        privacyPolicyUrl: LINKS.privacy,
        termsOfServiceUrl: LINKS.terms,
      }),
    },
    // Claude plugins, cursor.directory and the Codex plugin read this one.
    { path: ".mcp.json", content: json(servers({ type: "http", url: REMOTE })) },
    // Cursor Marketplace. The path keeps Cursor off the root mcp.json, which is in the Agent Plugins shape.
    {
      path: ".cursor-plugin/plugin.json",
      content: json({ ...common, logo: ICON, mcpServers: "./.cursor-plugin/mcp.json" }),
    },
    { path: ".cursor-plugin/mcp.json", content: json(servers({ url: REMOTE })) },
    // Gemini CLI extensions: httpUrl is Streamable HTTP (url would be SSE).
    {
      path: "gemini-extension.json",
      content: json({
        name: slug,
        version: PKG.version,
        description: listing.oneLine,
        ...servers({ httpUrl: REMOTE, oauth: { enabled: true } }),
      }),
    },
    // OpenAI plugin directory (ChatGPT and Codex). No $schema; OAuth is set in the portal.
    {
      path: ".codex-plugin/plugin.json",
      content: json({
        ...common,
        skills: "./skills/",
        mcpServers: "./.mcp.json",
        interface: {
          displayName: listing.name,
          shortDescription: listing.shortLine,
          longDescription: about,
          developerName: listing.name,
          category: "Developer Tools",
          capabilities: [],
          composerIcon: ICON,
          logo: ICON,
          websiteURL: LINKS.homepage,
          supportURL: LINKS.support,
          privacyPolicyURL: LINKS.privacy,
          termsOfServiceURL: LINKS.terms,
        },
      }),
    },
    // Agent Plugins 1.0 (Copilot CLI, Kiro): plugin.json and mcp.json at the root, same schema version.
    {
      path: "plugin.json",
      content: json({ $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", ...common }),
    },
    {
      path: "mcp.json",
      content: json({
        $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        ...servers({ type: "streamable-http", url: REMOTE }),
      }),
    },
  ];
}

/** Only `--dry-run` and exactly one out dir; anything else stops before a file is written. */
function parseArgs(argv) {
  const flags = argv.filter((a) => a.startsWith("-"));
  const dirs = argv.filter((a) => !a.startsWith("-"));
  const unknown = flags.find((f) => f !== "--dry-run");
  if (unknown) throw new Error(`unknown option ${unknown}; the only option is --dry-run`);
  if (dirs.length > 1) throw new Error(`one out dir at most, got ${dirs.length}: ${dirs.join(" ")}`);
  if (dirs.length === 0) throw new Error("give the out dir: node scripts/build-manifests.mjs <outDir> [--dry-run]");
  return { dryRun: flags.length > 0, out: resolve(dirs[0]) };
}

export async function main(argv = process.argv.slice(2)) {
  const { dryRun, out } = parseArgs(argv);
  checkOutDir(out);
  const manifests = buildManifests(parseListing(readFileSync(LISTING_DOC, "utf8")));
  if (dryRun) {
    for (const { path } of manifests) {
      console.log(`would ${existsSync(join(out, path)) ? "overwrite" : "write"} ${path}`);
    }
    console.log(`dry run: ${manifests.length} files to write in ${out}`);
    return;
  }
  for (const { path, content } of manifests) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), content);
  }
  console.log(`wrote ${manifests.length} manifests to ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
