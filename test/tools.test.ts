import { describe, expect, it } from "vitest";
import type { Catalog } from "../src/api.js";
import type { PromptBody } from "../src/api.js";
import { DIALECT_HELP, TOOL_IDS, dialectFor } from "../src/dialects.js";
import { formatPrompt, formatSearch, promptStructured, suggestSlugs } from "../src/tools.js";

const catalog: Catalog = {
  version: 1,
  tools: ["lovable", "bolt", "cursor", "claude", "codex"],
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

const SIGNED = "https://acct.r2.cloudflarestorage.com/nightmarquee-footage/isola/hero.mp4?X-Amz-Expires=600&X-Amz-Signature=abc";

const withFootage = (over: Partial<PromptBody> = {}): PromptBody => ({
  entitled: true,
  tier: "unlimited",
  tool: "claude",
  title: "Isola",
  text: "Build a fragrance hero.",
  demoUrl: "https://n.test/demo/isola",
  footage: [
    { name: "hero.mp4", role: "Bottle turntable (scroll scrub)", seconds: 5, bytes: 2_900_000, url: SIGNED },
    { name: "ambient.mp4", role: "Amber haze loop", seconds: 4.6, bytes: 640_000, url: `${SIGNED}&a=1` },
  ],
  footageExpiresInSeconds: 600,
  ...over,
});

describe("formatPrompt with footage", () => {
  it("tells the agent to download every clip into public/ before the links expire, then build", () => {
    const out = formatPrompt(withFootage(), "isola");
    expect(out.indexOf("Build a fragrance hero.")).toBe(0);
    expect(out).toMatch(/public\//);
    expect(out).toMatch(/10 minutes/);
    expect(out).toMatch(/then build/i);
    expect(out).toContain("hero.mp4: Bottle turntable (scroll scrub), 5s, 2.9 MB");
    expect(out).toContain("ambient.mp4: Amber haze loop, 4.6s, 0.6 MB");
    expect(out).toContain(SIGNED);
    // Signed URLs carry `&`, which a shell splits on unless quoted.
    expect(out).toMatch(/quote/i);
    // The files come before the build, often before public/ exists.
    expect(out).toContain("curl -fL --create-dirs -o public/hero.mp4");
    expect(out).toContain("https://n.test/demo/isola");
  });

  it("says when the links expire in other than ten minutes", () => {
    expect(formatPrompt(withFootage({ footageExpiresInSeconds: 300 }), "isola")).toMatch(/5 minutes/);
  });

  it("passes the server's footage message through when there are no links", () => {
    const out = formatPrompt(
      withFootage({ footage: undefined, footageMessage: "This demo plays 2 footage clips. Run nightmarquee_sign_in." }),
      "isola"
    );
    expect(out).toContain("This demo plays 2 footage clips. Run nightmarquee_sign_in.");
    expect(out).not.toMatch(/public\//);
  });

  it("adds nothing to a prompt without footage", () => {
    const out = formatPrompt(withFootage({ footage: undefined, footageExpiresInSeconds: undefined }), "isola");
    expect(out).not.toMatch(/footage/i);
  });

  it("never lists footage for a locked prompt", () => {
    const out = formatPrompt({ ...withFootage(), entitled: false, text: undefined, teaser: "A hero." }, "isola");
    expect(out).not.toContain(SIGNED);
  });

  it("does not repeat the server's footage message when links are present", () => {
    const out = formatPrompt(withFootage({ footageMessage: "unused" }), "isola");
    expect(out).not.toContain("unused");
  });
});

describe("promptStructured with footage", () => {
  it("passes the links through for an entitled prompt", () => {
    const out = promptStructured(withFootage(), "isola");
    expect(out.footage).toEqual(withFootage().footage);
    expect(out.footageExpiresInSeconds).toBe(600);
  });

  it("drops footage from a locked response, whatever the server sent", () => {
    const out = promptStructured({ ...withFootage(), entitled: false }, "isola");
    expect(out.footage).toBeUndefined();
    expect(out.footageExpiresInSeconds).toBeUndefined();
  });

  // The agent saves each file under its name, so a name is a path on the
  // user's disk. The server builds names from its own pack list, but the
  // package does not take that on trust.
  it.each([
    ["../../.ssh/authorized_keys"],
    ["public/hero.mp4"],
    ["..\\hero.mp4"],
    [".env"],
    [""],
    ["hero.mp4\nrm -rf ~"],
  ])("drops a clip named %j", (name) => {
    const body = withFootage();
    body.footage = [{ ...body.footage![0], name }, body.footage![1]];
    expect(promptStructured(body, "isola").footage?.map((c) => c.name)).toEqual(["ambient.mp4"]);
    expect(formatPrompt(body, "isola")).not.toContain(name || "\u0000");
  });

  it.each([["http://acct.r2.cloudflarestorage.com/x"], ["javascript:alert(1)"], ["not a url"]])(
    "drops a clip whose link is %j",
    (url) => {
      const body = withFootage();
      body.footage = [{ ...body.footage![0], url }, body.footage![1]];
      expect(promptStructured(body, "isola").footage?.map((c) => c.name)).toEqual(["ambient.mp4"]);
    }
  );

  it("drops malformed entries instead of failing output validation", () => {
    const body = withFootage({
      footage: [null, { name: "hero.mp4" }, "x", withFootage().footage![1]] as never,
    });
    expect(promptStructured(body, "isola").footage?.map((c) => c.name)).toEqual(["ambient.mp4"]);
  });

  it("drops a malformed expiry instead of failing output validation", () => {
    const out = promptStructured(withFootage({ footageExpiresInSeconds: "600" as never }), "isola");
    expect(out.footage).toHaveLength(2);
    expect(out.footageExpiresInSeconds).toBeUndefined();
  });

  it("leaves footage out when nothing usable remains", () => {
    const out = promptStructured(withFootage({ footage: [] }), "isola");
    expect(out.footage).toBeUndefined();
    expect(out.footageExpiresInSeconds).toBeUndefined();
  });

  it("passes the footage message through", () => {
    const out = promptStructured(withFootage({ footage: undefined, footageMessage: "Sign in." }), "isola");
    expect(out.footageMessage).toBe("Sign in.");
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

describe("dialects", () => {
  it("accepts the 5 dialects in the site's tab order, codex included", () => {
    expect(TOOL_IDS).toEqual(["lovable", "bolt", "cursor", "claude", "codex"]);
  });

  it("picks codex for a Codex client that names no dialect, with or without telemetry", () => {
    expect(dialectFor(undefined, "codex-mcp-client/0.160.1")).toBe("codex");
    expect(dialectFor("bolt", "codex-mcp-client/0.160.1")).toBe("bolt");
    expect(dialectFor(undefined, "claude-code/2.1.240")).toBeUndefined();
    expect(dialectFor(undefined, "unknown")).toBeUndefined();
  });

  it("tells the model what it gets when it names none", () => {
    expect(DIALECT_HELP).toContain("codex");
    expect(DIALECT_HELP).toContain("claude");
  });
});
