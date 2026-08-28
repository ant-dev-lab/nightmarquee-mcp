import { describe, expect, it } from "vitest";
import { PACKAGE_VERSION } from "../src/version.js";

describe("PACKAGE_VERSION", () => {
  it("is a semver string matching the manifest", async () => {
    const pkg = await import("../package.json", { with: { type: "json" } });
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(PACKAGE_VERSION).toBe(pkg.default.version);
  });
});
