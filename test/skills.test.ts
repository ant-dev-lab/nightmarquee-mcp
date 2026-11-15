import { describe, expect, it } from "vitest";
import { buildSkills } from "../scripts/build-skills.mjs";

const prompt = (over: Record<string, unknown> = {}) => ({
  slug: "glasshouse-nine",
  title: "Glasshouse Nine",
  category: "hero",
  tier: "free",
  brand: "Glasshouse",
  tagline: "A greenhouse hero that breathes",
  description: "Scroll scrubs a glasshouse at dawn.",
  chips: ["scroll scrub"],
  drop: 1,
  publishedAt: "2026-01-01",
  demoUrl: "https://nightmarquee.com/demo/glasshouse-nine",
  pageUrl: "https://nightmarquee.com/p/glasshouse-nine",
  ...over,
});

const catalog = {
  version: 1,
  tools: ["lovable", "bolt", "cursor", "claude", "codex"],
  categories: [],
  prompts: [prompt(), prompt({ slug: "oud-ember", title: "Oud & Ember", tier: "unlimited" })],
};

/** The frontmatter the skills CLI reads, as key: value pairs. */
function frontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error("no frontmatter");
  return Object.fromEntries(
    m[1].split("\n").map((line) => {
      const i = line.indexOf(":");
      return [line.slice(0, i), JSON.parse(line.slice(i + 1).trim())];
    })
  );
}

describe("buildSkills", () => {
  const skills = buildSkills(catalog);
  const byPath = Object.fromEntries(skills.map((s) => [s.path, s.content]));

  it("writes one guide skill and one skill per free prompt, none for paid ones", () => {
    expect(Object.keys(byPath).sort()).toEqual([
      "skills/nightmarquee-glasshouse-nine/SKILL.md",
      "skills/nightmarquee/SKILL.md",
    ]);
  });

  it("gives every skill a valid name and a description within the limits", () => {
    for (const { path, content } of skills) {
      const fm = frontmatter(content);
      expect(fm.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(fm.name.length).toBeLessThanOrEqual(64);
      expect(path).toBe(`skills/${fm.name}/SKILL.md`);
      expect(fm.description.length).toBeGreaterThan(40);
      expect(fm.description.length).toBeLessThanOrEqual(1024);
    }
  });

  it("tells the agent how to fetch the current prompt, with or without the MCP server", () => {
    const md = byPath["skills/nightmarquee-glasshouse-nine/SKILL.md"];
    expect(md).toContain('get_design(slug: "glasshouse-nine"');
    expect(md).toContain('get_starter(slug: "glasshouse-nine")');
    expect(md).toContain('get_footage(slug: "glasshouse-nine")');
    expect(md).toContain("https://nightmarquee.com/p/glasshouse-nine");
    expect(md).toContain("https://nightmarquee.com/demo/glasshouse-nine");
    expect(md).toContain("A greenhouse hero that breathes");
  });

  it("explains the remote server's steps in the guide, footage and starter included", () => {
    const md = byPath["skills/nightmarquee/SKILL.md"];
    expect(md).toContain("https://mcp.nightmarquee.com/mcp");
    expect(md).toContain("claude mcp add --transport http nightmarquee https://mcp.nightmarquee.com/mcp");
    for (const tool of ["search_designs", "get_design", "get_starter", "get_footage"]) expect(md).toContain(tool);
    expect(md).toMatch(/public\//);
    expect(md).toContain("npx -y nightmarquee"); // the older way, for a tool that cannot add a remote address
    expect(md).toContain("codex mcp add nightmarquee --url https://mcp.nightmarquee.com/mcp");
  });

  it("puts footage where the starter and the prompt read it, skips the masters, and gives the starter's limits", () => {
    const md = byPath["skills/nightmarquee-glasshouse-nine/SKILL.md"];
    expect(md).toContain("public/drops/glasshouse-nine/");
    expect(md).toContain("-original.mp4");
    expect(md).toContain("NEXT_PUBLIC_FOOTAGE_LOCAL=1 npm run dev");
    expect(md).toContain("starter.available");
    expect(md).toContain("not_found");
    expect(md).toContain("glasshouse-nine-starter/");
    expect(md).toMatch(/5 starters a day/);
    expect(byPath["skills/nightmarquee/SKILL.md"]).toContain("public/drops/<slug>/");
  });

  it("says a paid design needs a plan, and a brand is a site name of up to 24 characters", () => {
    const guide = byPath["skills/nightmarquee/SKILL.md"];
    expect(guide).toMatch(/paid designs need a plan/i);
    expect(guide).toContain("up to 24 characters");
  });

  it("names no tool of the old package and no route it calls, which are retired after the remote server", () => {
    for (const { content } of skills) {
      expect(content).not.toMatch(/nightmarquee_[a-z]+/);
      expect(content).not.toContain("/api/mcp/");
    }
  });

  it("carries no prompt body and no long dashes", () => {
    for (const { content } of skills) {
      expect(content).not.toMatch(/[\u2013\u2014]/);
      expect(content.length).toBeLessThan(6000);
    }
  });

  it("quotes values so a colon or quote in copy cannot break the frontmatter", () => {
    const tricky = buildSkills({
      ...catalog,
      prompts: [prompt({ tagline: 'Dawn: "glass" and steam' })],
    });
    const fm = frontmatter(tricky[1].content);
    expect(fm.description).toContain('Dawn: "glass" and steam');
  });
});
