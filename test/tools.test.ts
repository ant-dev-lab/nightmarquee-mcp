import { describe, expect, it } from "vitest";
import type { Catalog } from "../src/api.js";
import { formatPrompt, formatSearch, suggestSlugs } from "../src/tools.js";

const catalog: Catalog = {
  version: 1,
  tools: ["lovable", "bolt", "cursor", "claude"],
  categories: [],
  prompts: [
    { slug: "isola", title: "Isola", category: "hero", tier: "unlimited", brand: "Isola",
      tagline: "Composed for the hour the light turns amber", description: "A fragrance hero.",
      chips: ["product hero"], drop: 6, publishedAt: "2026-01-01",
      demoUrl: "https://n.test/demo/isola", pageUrl: "https://n.test/p/isola" },
    { slug: "verdant-saas", title: "Verdant", category: "saas", tier: "free", brand: "Verdant",
      tagline: "Growth you can watch happen", description: "A SaaS landing page.",
      chips: ["dashboard"], drop: 3, publishedAt: "2026-01-02",
      demoUrl: "https://n.test/demo/verdant-saas", pageUrl: "https://n.test/p/verdant-saas" },
  ],
};

describe("formatSearch", () => {
  it("lists every prompt with tier and demo link when unfiltered", () => {
    const out = formatSearch(catalog, {});
    expect(out).toContain("isola");
    expect(out).toContain("verdant-saas");
    expect(out).toContain("https://n.test/demo/isola");
    expect(out).toMatch(/unlimited/i);
  });

  it("filters by category, tier and free-text query", () => {
    expect(formatSearch(catalog, { category: "saas" })).not.toContain("isola");
    expect(formatSearch(catalog, { tier: "free" })).not.toContain("isola");
    expect(formatSearch(catalog, { query: "amber" })).toContain("isola");
    expect(formatSearch(catalog, { query: "amber" })).not.toContain("verdant-saas");
  });

  it("respects the limit and says what it withheld", () => {
    const out = formatSearch(catalog, { limit: 1 });
    expect(out).toMatch(/1 more/);
  });

  it("says so plainly when nothing matches", () => {
    expect(formatSearch(catalog, { query: "zzzz" })).toMatch(/no prompts/i);
  });
});

describe("formatPrompt", () => {
  it("returns the body for an entitled prompt", () => {
    const out = formatPrompt(
      { entitled: true, tier: "free", tool: "claude", title: "Verdant",
        text: "Build a SaaS landing page.", demoUrl: "https://n.test/demo/verdant-saas" },
      "verdant-saas"
    );
    expect(out).toContain("Build a SaaS landing page.");
    expect(out).toContain("https://n.test/demo/verdant-saas");
  });

  it("returns teaser plus upsell for a locked prompt, never the body", () => {
    const out = formatPrompt(
      { entitled: false, tier: "unlimited", signedIn: false, teaser: "A fragrance hero.",
        upsell: { pricingUrl: "https://n.test/pricing?ref=mcp",
                  message: "This is an Unlimited prompt. Run nightmarquee_sign_in to connect an account, or unlock every drop:" } },
      "isola"
    );
    expect(out).toContain("A fragrance hero.");
    expect(out).toContain("nightmarquee_sign_in");
    expect(out).toContain("https://n.test/pricing?ref=mcp");
    expect(out).toMatch(/locked/i);
  });
});

describe("suggestSlugs", () => {
  it("finds near misses", () => {
    expect(suggestSlugs(catalog, "isla")).toContain("isola");
    expect(suggestSlugs(catalog, "verdant")).toContain("verdant-saas");
  });

  it("returns nothing for a wild miss", () => {
    expect(suggestSlugs(catalog, "qqqqqqqq")).toHaveLength(0);
  });
});
