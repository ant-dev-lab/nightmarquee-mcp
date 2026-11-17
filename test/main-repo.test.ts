import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inMainRepo, repoRoot } from "./main-repo";

describe.skipIf(!inMainRepo)("the main repo files these tests read", () => {
  // inMainRepo is decided by the layout alone, so a moved file here fails instead of skipping the checks that read it
  it("has docs/voice.md for the voice linter", () => {
    expect(existsSync(join(repoRoot, "docs", "voice.md"))).toBe(true);
  });
});
