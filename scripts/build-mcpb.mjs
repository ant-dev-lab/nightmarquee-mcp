#!/usr/bin/env node
/**
 * Builds the MCPB bundle: the one-click install artifact for Claude Desktop,
 * and the only format Smithery accepts for a local stdio server.
 *
 * The bundle has to be self-contained, which the workspace is not: npm hoists
 * @modelcontextprotocol/server and zod to the repo root, so a bundle that just
 * zips this package would resolve nothing on a user's machine. We therefore
 * stage a clean tree and install production deps into it.
 *
 * Output: build/nightmarquee.mcpb (gitignored). The filename deliberately
 * carries no version: it is uploaded to GitHub Releases under this name so
 * https://.../releases/latest/download/nightmarquee.mcpb keeps working across
 * bumps. The version lives in the manifest and the release tag.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readTools } from "./read-tools.mjs";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const build = join(pkgRoot, "build");
const stage = join(build, "stage");

const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(pkgRoot, "manifest.json"), "utf8"));

// package.json is the single source of truth for the version.
manifest.version = pkg.version;

if (!existsSync(join(pkgRoot, "dist", "index.js"))) {
  console.error("dist/index.js is missing. Run `npm run build -w nightmarquee` first.");
  process.exit(1);
}

rmSync(build, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

cpSync(join(pkgRoot, "dist"), join(stage, "server"), { recursive: true });
cpSync(join(pkgRoot, "README.md"), join(stage, "README.md"));
cpSync(join(pkgRoot, "icon.png"), join(stage, "icon.png"));

// A minimal package.json so npm installs only what the server actually needs.
writeFileSync(
  join(stage, "package.json"),
  JSON.stringify(
    {
      name: `${pkg.name}-mcpb`,
      version: pkg.version,
      private: true,
      type: "module",
      dependencies: pkg.dependencies,
    },
    null,
    2
  ) + "\n"
);

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "inherit", encoding: "utf8" });

run("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], stage);

/**
 * Take the declared tools from the server itself rather than from a hand-kept
 * list, so a renamed or added tool cannot leave the manifest describing
 * something that no longer exists. Only name and description are carried
 * over: the MCPB manifest schema rejects any other key on a tool.
 */
try {
  manifest.tools = await readTools(join(stage, "server", "index.js"));
} catch (err) {
  console.error("Could not read tools/list from the staged server.");
  console.error(String(err));
  process.exit(1);
}
console.log(`Declared ${manifest.tools.length} tools from the live server.`);
writeFileSync(join(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const out = join(build, "nightmarquee.mcpb");
run("npx", ["-y", "@anthropic-ai/mcpb@2.1.2", "pack", stage, out], pkgRoot);
run("npx", ["-y", "@anthropic-ai/mcpb@2.1.2", "clean", out], pkgRoot);

console.log(`\nBundle ready: ${out}`);
