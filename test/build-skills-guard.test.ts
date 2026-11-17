import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSkills, checkOutDir, main } from "../scripts/build-skills.mjs";
import { inMainRepo, pkgRoot, repoRoot } from "./main-repo";

const catalog = {
  version: 1,
  tools: ["claude"],
  categories: [],
  prompts: [
    {
      slug: "glasshouse-nine",
      title: "Glasshouse Nine",
      category: "hero",
      tier: "free",
      tagline: "A greenhouse hero that breathes",
      description: "Scroll scrubs a glasshouse at dawn.",
      demoUrl: "https://nightmarquee.com/demo/glasshouse-nine",
      pageUrl: "https://nightmarquee.com/p/glasshouse-nine",
    },
  ],
};

const fakeFetch = async () => new Response(JSON.stringify(catalog), { status: 200 });
const tempDir = () => mkdtempSync(join(tmpdir(), "nm-skills-guard-"));

/** A folder that looks like the public plugin repo: .claude-plugin/plugin.json with the given name. */
function pluginRepo(name: string): string {
  const dir = tempDir();
  mkdirSync(join(dir, ".claude-plugin"));
  writeFileSync(join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name }));
  return dir;
}

afterEach(() => vi.restoreAllMocks());

describe("build-skills out dir guard", () => {
  it("refuses an out dir that is not the package or the plugin repo", () => {
    const empty = tempDir();
    expect(() => checkOutDir(empty)).toThrow(/not the nightmarquee package or the plugin repo/);

    const other = tempDir();
    writeFileSync(join(other, "package.json"), JSON.stringify({ name: "someone-else" }));
    expect(() => checkOutDir(other)).toThrow(/not the nightmarquee package or the plugin repo/);

    expect(() => checkOutDir(pkgRoot)).not.toThrow();
    expect(() => checkOutDir(pluginRepo("nightmarquee"))).not.toThrow();
  });

  it("refuses a folder whose package.json is named nightmarquee but is not this package", () => {
    const copy = tempDir();
    writeFileSync(join(copy, "package.json"), JSON.stringify({ name: "nightmarquee" }));
    expect(() => checkOutDir(copy)).toThrow(/not the nightmarquee package or the plugin repo/);
  });

  it.skipIf(!inMainRepo)("refuses the main repo's root, whose package.json is named nightmarquee too", () => {
    expect(JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).name).toBe("nightmarquee");
    expect(() => checkOutDir(repoRoot)).toThrow(/not the nightmarquee package or the plugin repo/);
  });

  it("refuses another Claude plugin's checkout", () => {
    expect(() => checkOutDir(pluginRepo("someone-elses-plugin"))).toThrow(/not the nightmarquee package or the plugin repo/);
    const empty = tempDir();
    mkdirSync(join(empty, ".claude-plugin"));
    writeFileSync(join(empty, ".claude-plugin", "plugin.json"), "{}");
    expect(() => checkOutDir(empty)).toThrow(/not the nightmarquee package or the plugin repo/);
  });

  it("refuses an unknown flag or an extra argument before deleting anything", async () => {
    const dir = pluginRepo("nightmarquee");
    mkdirSync(join(dir, "skills", "old"), { recursive: true });
    await expect(main([dir, "--dryrun"], fakeFetch)).rejects.toThrow(/unknown option --dryrun/);
    await expect(main([dir, dir], fakeFetch)).rejects.toThrow(/one out dir at most/);
    expect(existsSync(join(dir, "skills", "old"))).toBe(true);
  });

  it("deletes nothing in a refused out dir", async () => {
    const dir = tempDir();
    mkdirSync(join(dir, "skills", "old"), { recursive: true });
    await expect(main([dir], fakeFetch)).rejects.toThrow(/not the nightmarquee package/);
    expect(existsSync(join(dir, "skills", "old"))).toBe(true);
  });

  it("a dry run deletes nothing", async () => {
    const dir = pluginRepo("nightmarquee");
    mkdirSync(join(dir, "skills", "old"), { recursive: true });
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: string) => void lines.push(line));

    await main([dir, "--dry-run"], fakeFetch);

    expect(existsSync(join(dir, "skills", "old"))).toBe(true);
    expect(existsSync(join(dir, "skills", "nightmarquee"))).toBe(false);
    expect(lines).toContain("would delete skills/old/");
    expect(lines).toContain("would write skills/nightmarquee/SKILL.md");
    expect(lines).toContain("would write skills/nightmarquee-ai-look-test/fixes.md");
  });

  it("a real run removes a stale skill folder, writes every listed file, and leaves the rest of the repo alone", async () => {
    const dir = pluginRepo("nightmarquee");
    mkdirSync(join(dir, "skills", "nightmarquee-retired", "nested"), { recursive: true });
    writeFileSync(join(dir, "skills", "nightmarquee-retired", "nested", "SKILL.md"), "old");
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "docs", "keep.md"), "mine");
    writeFileSync(join(dir, "README.md"), "readme");
    vi.spyOn(console, "log").mockImplementation(() => {});

    await main([dir], fakeFetch);

    expect(existsSync(join(dir, "skills", "nightmarquee-retired"))).toBe(false);
    const expected = buildSkills(catalog);
    expect(expected.length).toBeGreaterThan(1);
    for (const { path, content } of expected) expect(readFileSync(join(dir, path), "utf8"), path).toBe(content);
    expect(readdirSync(join(dir, "skills")).sort()).toEqual([...new Set(expected.map((s) => s.path.split("/")[1]))].sort());
    expect(readFileSync(join(dir, "docs", "keep.md"), "utf8")).toBe("mine");
    expect(readFileSync(join(dir, "README.md"), "utf8")).toBe("readme");
    expect(JSON.parse(readFileSync(join(dir, ".claude-plugin", "plugin.json"), "utf8")).name).toBe("nightmarquee");
  });

  it("refuses a catalog with no free designs before deleting anything", async () => {
    const paidOnly = { ...catalog, prompts: catalog.prompts.map((p) => ({ ...p, tier: "unlimited" })) };
    for (const answer of [{ ...catalog, prompts: [] }, paidOnly]) {
      const dir = pluginRepo("nightmarquee");
      mkdirSync(join(dir, "skills", "nightmarquee-glasshouse-nine"), { recursive: true });
      writeFileSync(join(dir, "skills", "nightmarquee-glasshouse-nine", "SKILL.md"), "kept");
      const fetchIt = async () => new Response(JSON.stringify(answer), { status: 200 });
      for (const args of [[dir], [dir, "--dry-run"]]) {
        await expect(main(args, fetchIt)).rejects.toThrow(/no free designs/);
      }
      expect(readFileSync(join(dir, "skills", "nightmarquee-glasshouse-nine", "SKILL.md"), "utf8")).toBe("kept");
    }
  });
});
