import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * These tests are copied as they are into the public repo (nightmarquee/nightmarquee-mcp), where the
 * package is the repo root. A few checks need files that stay in the main repo (the voice linter and
 * docs/voice.md, the listing doc, the repo root). They run when this package sits at
 * packages/nightmarquee-mcp of the main repo. That is decided by the layout alone, so in the main repo a
 * moved or missing file fails its test (main-repo.test.ts checks docs/voice.md) instead of skipping it.
 */
export const pkgRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const repoRoot = resolve(pkgRoot, "..", "..");
export const inMainRepo = resolve(repoRoot, "packages", "nightmarquee-mcp") === pkgRoot;
