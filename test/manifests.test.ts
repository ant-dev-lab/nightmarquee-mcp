import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, normalize } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildManifests, main, parseListing } from "../scripts/build-manifests.mjs";
import { inMainRepo, pkgRoot, repoRoot } from "./main-repo";

const REMOTE = "https://mcp.nightmarquee.com/mcp";
const PATHS = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".cursor-plugin/mcp.json",
  ".cursor-plugin/plugin.json",
  ".mcp.json",
  "gemini-extension.json",
  "mcp.json",
  "plugin.json",
];
type Listing = { name: string; oneLine: string; shortLine: string; description: string };

/**
 * In the main repo the manifests are built from the listing doc. In the public repo, which ships them
 * but not the doc, the same checks run on the files on disk, with the shared text read back from them.
 */
function fromDisk(): { listing: Listing; manifests: { path: string; content: string }[] } {
  const manifests = PATHS.map((path) => ({ path, content: readFileSync(join(pkgRoot, path), "utf8") }));
  const read = (p: string) => JSON.parse(manifests.find((m) => m.path === p)!.content);
  const claude = read(".claude-plugin/plugin.json");
  const oneLine = read("gemini-extension.json").description;
  return {
    manifests,
    listing: {
      name: claude.displayName,
      oneLine,
      shortLine: read(".codex-plugin/plugin.json").interface.shortDescription,
      description: claude.description.slice(oneLine.length + 1),
    },
  };
}
const listingDoc = join(repoRoot, "docs", "marketing", "2026-11-12-mcp-listing-updates.md");
const { listing, manifests } = inMainRepo
  ? (() => {
      const listing = parseListing(readFileSync(listingDoc, "utf8"));
      return { listing, manifests: buildManifests(listing) };
    })()
  : fromDisk();
const parsed = manifests.map(({ path, content }) => ({ path, content, json: JSON.parse(content) }));

/** Files that hold only server entries; the rest are plugin manifests that describe the listing. */
const isServerFile = (json: Record<string, unknown>) => Object.keys(json).every((k) => k === "mcpServers" || k === "$schema");
const serverFiles = parsed.filter((m) => isServerFile(m.json));
const pluginFiles = parsed.filter((m) => !isServerFile(m.json));

const tempDir = () => mkdtempSync(join(tmpdir(), "nm-manifests-"));
function pluginRepo(name: string): string {
  const dir = tempDir();
  mkdirSync(join(dir, ".claude-plugin"));
  writeFileSync(join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name }));
  return dir;
}

afterEach(() => vi.restoreAllMocks());

describe.skipIf(!inMainRepo)("listing text", () => {
  it("reads the shared name, one line and description from the listing doc", () => {
    expect(listing.name).toBe("NightMarquee");
    expect(listing.oneLine).toMatch(/^Cinematic website designs/);
    expect(listing.description).toMatch(/^Add one address/);
    expect(listing.shortLine.length).toBeGreaterThan(0);
    expect(listing.shortLine.length).toBeLessThanOrEqual(30);
  });

  it("fails loudly when a shared block is missing", () => {
    expect(() => parseListing("## Shared text\n\n- **Name:** NightMarquee\n")).toThrow(/One line/);
  });
});

describe("buildManifests", () => {
  it("writes each manifest a directory needs", () => {
    expect(manifests.map((m) => m.path).sort()).toEqual([...PATHS].sort());
  });

  it("every manifest points at the remote address only", () => {
    for (const { path, content, json } of parsed) {
      expect(content, path).not.toMatch(/npx/);
      expect(content, path).not.toMatch(/"command"/);
      expect(content, path).not.toMatch(/"args"/);
      if (typeof json.mcpServers === "object") {
        const entries = Object.values(json.mcpServers as Record<string, Record<string, unknown>>);
        expect(entries.length, path).toBe(1);
        for (const entry of entries) expect(entry.url ?? entry.httpUrl, path).toBe(REMOTE);
      }
    }
    expect(serverFiles.length).toBeGreaterThan(0);
    for (const { path, content } of serverFiles) expect(content, path).toContain(REMOTE);
  });

  it("every server path a manifest names is a file it ships", () => {
    const shipped = new Set(manifests.map((m) => m.path));
    for (const { path, json } of pluginFiles) {
      if (typeof json.mcpServers !== "string") continue;
      expect(json.mcpServers, path).not.toContain("..");
      expect(shipped.has(normalize(json.mcpServers)), `${path} names ${json.mcpServers}`).toBe(true);
    }
  });

  it("every manifest carries the shared name and line", () => {
    expect(pluginFiles.length).toBeGreaterThan(0);
    for (const { path, json, content } of pluginFiles) {
      expect(json.name, path).toBe(listing.name.toLowerCase());
      expect(content, path).toContain(listing.oneLine);
      for (const display of [json.displayName, json.interface?.displayName]) {
        if (display !== undefined) expect(display, path).toBe(listing.name);
      }
    }
    const claude = parsed.find((m) => m.path === ".claude-plugin/plugin.json")!;
    expect(claude.content).toContain(listing.description);
  });

  it("keeps OpenAI's 30 character interface fields", () => {
    const codex = parsed.find((m) => m.path === ".codex-plugin/plugin.json")!.json;
    expect(codex.interface.displayName.length).toBeLessThanOrEqual(30);
    expect(codex.interface.shortDescription).toBe(listing.shortLine);
    expect(codex.mcpServers).toBe("./.mcp.json");
    expect(codex.$schema).toBeUndefined();
  });

  it("uses each host's own server shape", () => {
    const get = (p: string) => parsed.find((m) => m.path === p)!.json.mcpServers.nightmarquee;
    expect(get(".mcp.json")).toEqual({ type: "http", url: REMOTE });
    expect(get(".cursor-plugin/mcp.json")).toEqual({ url: REMOTE });
    expect(get("mcp.json")).toEqual({ type: "streamable-http", url: REMOTE });
    expect(get("gemini-extension.json")).toEqual({ httpUrl: REMOTE, oauth: { enabled: true } });
    expect(parsed.find((m) => m.path === "mcp.json")!.json.$schema).toMatch(/agent-plugins\.org\/schemas\/1\.0\.0\//);
    expect(parsed.find((m) => m.path === "plugin.json")!.json.$schema).toMatch(/agent-plugins\.org\/schemas\/1\.0\.0\//);
  });

  it("no long dashes", () => {
    for (const { path, content } of parsed) expect(content, path).not.toMatch(/[–—]/);
  });
});

describe.skipIf(!inMainRepo)("build-manifests main", () => {
  it("writes the manifests into the plugin repo", async () => {
    const dir = pluginRepo("nightmarquee");
    vi.spyOn(console, "log").mockImplementation(() => {});
    await main([dir]);
    for (const { path, content } of manifests) expect(readFileSync(join(dir, path), "utf8")).toBe(content);
  });

  it("writes nothing on a dry run", async () => {
    const dir = pluginRepo("nightmarquee");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await main([dir, "--dry-run"]);
    expect(existsSync(join(dir, "gemini-extension.json"))).toBe(false);
    expect(log.mock.calls.flat().join("\n")).toMatch(/would write gemini-extension\.json/);
  });

  it("refuses a foreign out dir, an unknown flag or an extra argument", async () => {
    await expect(main([])).rejects.toThrow(/give the out dir/);
    const empty = tempDir();
    await expect(main([empty])).rejects.toThrow(/not the nightmarquee package or the plugin repo/);
    await expect(main([pluginRepo("someone-elses-plugin")])).rejects.toThrow(/not the nightmarquee package or the plugin repo/);
    const dir = pluginRepo("nightmarquee");
    await expect(main([dir, "--dryrun"])).rejects.toThrow(/unknown option --dryrun/);
    await expect(main([dir, dir])).rejects.toThrow(/one out dir at most/);
    expect(existsSync(join(empty, "mcp.json"))).toBe(false);
    expect(existsSync(join(dir, "mcp.json"))).toBe(false);
  });
});
