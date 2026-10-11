import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../src/api.js";
import { fetchFootage, formatPrompt } from "../src/tools.js";

const session: Session = { creds: { installId: "abc-123", token: "nm_live_t" }, client: "vitest/1.0" };

const SIGNED = "https://acct.r2.cloudflarestorage.com/nightmarquee-footage/isola/hero.mp4?X-Amz-Expires=600&X-Amz-Signature=abc";

/** What /api/footage/isola returns to an entitled caller. */
const PACK = {
  slug: "isola",
  expiresInSeconds: 600,
  clips: [
    { name: "hero.mp4", role: "Bottle turntable", seconds: 5, bytes: 2_900_000, width: 1920, height: 1080, url: SIGNED },
    { name: "../escape.mp4", role: "Bad", seconds: 1, bytes: 1, width: 1, height: 1, url: SIGNED },
  ],
};

const respond = (status: number, body: unknown = {}) =>
  vi.fn<(input: string, init: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify(body), { status })
  );

beforeEach(() => {
  vi.stubEnv("NIGHTMARQUEE_API", "http://api.test");
  vi.stubEnv("NIGHTMARQUEE_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchFootage", () => {
  it("asks the footage endpoint with the account's token", async () => {
    const fetchMock = respond(200, PACK);
    vi.stubGlobal("fetch", fetchMock);
    await fetchFootage("isola", session);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/api/footage/isola");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer nm_live_t");
  });

  it("encodes the slug into the path", async () => {
    const fetchMock = respond(404);
    vi.stubGlobal("fetch", fetchMock);
    await fetchFootage("../x?y", session);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/footage/..%2Fx%3Fy");
  });

  it("returns fresh links with the same download steps as get_prompt, keeping only safe names", async () => {
    vi.stubGlobal("fetch", respond(200, PACK));
    const { text, structured } = await fetchFootage("isola", session);
    expect(structured.footage?.map((c) => c.name)).toEqual(["hero.mp4"]);
    expect(Object.keys(structured.footage![0]).sort()).toEqual(["bytes", "name", "role", "seconds", "url"]);
    expect(structured.footageExpiresInSeconds).toBe(600);
    expect(text).toContain(SIGNED);
    expect(text).toContain("curl -fL --create-dirs -o public/hero.mp4");
    expect(text).toMatch(/10 minutes/);
    expect(text).not.toContain("escape.mp4");
  });

  it("points at nightmarquee_sign_in when the caller has no account", async () => {
    vi.stubGlobal("fetch", respond(401, { error: "sign_in" }));
    const { text, structured } = await fetchFootage("isola", session);
    expect(text).toContain("nightmarquee_sign_in");
    // On an Unlimited prompt a free account would only reach a 403, so say so up front.
    expect(text).toMatch(/Unlimited/);
    expect(structured.footage).toBeUndefined();
    expect(structured.message).toBe(text);
  });

  it("points at pricing when the account is not Unlimited", async () => {
    vi.stubGlobal("fetch", respond(403, { error: "upgrade" }));
    const { text, structured } = await fetchFootage("isola", session);
    expect(text).toContain("https://nightmarquee.com/pricing?ref=mcp");
    expect(structured.pricingUrl).toBe("https://nightmarquee.com/pricing?ref=mcp");
    expect(structured.footage).toBeUndefined();
  });

  it("says so when the prompt is unknown or plays no footage", async () => {
    vi.stubGlobal("fetch", respond(404, { error: "not_found" }));
    const { text } = await fetchFootage("nope", session);
    expect(text).toMatch(/no footage/i);
    expect(text).toContain('"nope"');
  });

  it("says when the hourly limit is reached", async () => {
    vi.stubGlobal("fetch", respond(429, { error: "rate_limited" }));
    expect((await fetchFootage("isola", session)).text).toMatch(/hour/);
  });

  it("degrades to readable text when the site is down or unreachable", async () => {
    vi.stubGlobal("fetch", respond(503));
    const down = await fetchFootage("isola", session);
    expect(down.structured.error).toMatch(/nightmarquee.com/);

    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("ECONNREFUSED"))));
    const unreachable = await fetchFootage("isola", session);
    expect(unreachable.structured.error).toMatch(/Couldn't reach nightmarquee.com/);
  });

  it("reads a pack with no usable clips as an answer, not a crash", async () => {
    vi.stubGlobal("fetch", respond(200, { slug: "isola", expiresInSeconds: 600, clips: "nope" }));
    const { structured } = await fetchFootage("isola", session);
    expect(structured.footage).toBeUndefined();
    expect(structured.error).toBeTruthy();
  });
});

describe("the footage section of get_prompt", () => {
  it("points at nightmarquee_get_footage for fresh links", () => {
    const out = formatPrompt(
      {
        entitled: true,
        tier: "unlimited",
        text: "Build it.",
        footage: [{ name: "hero.mp4", role: "Bottle turntable", seconds: 5, bytes: 2_900_000, url: SIGNED }],
        footageExpiresInSeconds: 600,
      },
      "isola"
    );
    expect(out).toContain('nightmarquee_get_footage(slug: "isola")');
  });
});
