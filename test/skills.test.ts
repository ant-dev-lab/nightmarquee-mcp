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
    expect(md).toContain('nightmarquee_get_prompt(slug: "glasshouse-nine"');
    expect(md).toContain("https://nightmarquee.com/api/mcp/prompt/glasshouse-nine?tool=claude");
    expect(md).toContain("https://nightmarquee.com/demo/glasshouse-nine");
    expect(md).toContain("A greenhouse hero that breathes");
  });

  it("explains the footage step in the guide", () => {
    const md = byPath["skills/nightmarquee/SKILL.md"];
    expect(md).toContain("nightmarquee_search_prompts");
    expect(md).toContain("nightmarquee_get_footage");
    expect(md).toMatch(/public\//);
    expect(md).toContain("npx -y nightmarquee");
  });

  it("carries no prompt body and no long dashes", () => {
    for (const { content } of skills) {
      expect(content).not.toMatch(/[–—]/);
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
