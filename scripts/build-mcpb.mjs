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
 * Output: build/nightmarquee-<version>.mcpb (gitignored).
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
writeFileSync(join(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

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

const out = join(build, `nightmarquee-${pkg.version}.mcpb`);
run("npx", ["-y", "@anthropic-ai/mcpb@2.1.2", "pack", stage, out], pkgRoot);
run("npx", ["-y", "@anthropic-ai/mcpb@2.1.2", "clean", out], pkgRoot);

console.log(`\nBundle ready: ${out}`);
