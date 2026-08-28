import type { McpServer } from "@modelcontextprotocol/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogPrompt, Session } from "../src/api.js";
import { resetCatalogCache } from "../src/catalog.js";
import { registerCatalogPrompts } from "../src/prompts.js";

type PromptConfig = { title?: string; description?: string; argsSchema?: unknown };
type PromptCb = (
  args: { brand?: string; tool?: string },
  ctx?: unknown
) => Promise<{ messages: { content: { text: string } }[] }>;

interface Recorded {
  name: string;
  config: PromptConfig;
  cb: PromptCb;
}

/** Records registrations, and can be told to reject one the way the SDK does. */
function fakeServer(rejecting?: string) {
  const registered: Recorded[] = [];
  const server = {
    registerPrompt(name: string, config: PromptConfig, cb: PromptCb) {
      if (name === rejecting) throw new Error(`Prompt ${name} is already registered`);
      registered.push({ name, config, cb });
      return {} as never;
    },
  };
  return { registered, server: server as unknown as McpServer };
}

const entry = (over: Partial<CatalogPrompt> = {}): CatalogPrompt => ({
  slug: "isola",
  title: "Isola",
  category: "hero",
  tier: "unlimited",
  brand: "Isola",
  tagline: "Composed for the hour the light turns amber",
  description: "A fragrance hero.",
  chips: [],
  drop: 6,
  publishedAt: "2026-01-01",
  demoUrl: "http://x/demo/isola",
  pageUrl: "http://x/p/isola",
  ...over,
});

const session = (creds: Partial<Session["creds"]> = {}): Session => ({
  creds: { installId: "install-1", ...creds },
  client: "vitest/1.0.0",
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  resetCatalogCache();
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NIGHTMARQUEE_API", "http://api.test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("registerCatalogPrompts", () => {
  it("registers nothing and does not throw when the catalog is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const { registered, server } = fakeServer();

    await expect(
      registerCatalogPrompts(server, () => session())
    ).resolves.toBeUndefined();
    expect(registered).toEqual([]);
  });

  it("lists locked prompts, marked Unlimited", async () => {
    fetchMock.mockResolvedValue(
      json({ version: 1, tools: [], categories: [], prompts: [entry()] })
    );
    const { registered, server } = fakeServer();

    await registerCatalogPrompts(server, () => session());

    expect(registered).toHaveLength(1);
    expect(registered[0].name).toBe("isola");
    expect(registered[0].config.title).toBe(
      "Isola — Composed for the hour the light turns amber"
    );
    expect(registered[0].config.description).toBe("A fragrance hero. (Unlimited)");
  });

  it("leaves a free prompt's description alone", async () => {
    fetchMock.mockResolvedValue(
      json({
        version: 1,
        tools: [],
        categories: [],
        prompts: [entry({ slug: "aetheris-voyage", tier: "free" })],
      })
    );
    const { registered, server } = fakeServer();

    await registerCatalogPrompts(server, () => session());

    expect(registered[0].config.description).toBe("A fragrance hero.");
  });

  it("keeps registering after one entry is rejected, and says so on stderr", async () => {
    fetchMock.mockResolvedValue(
      json({
        version: 1,
        tools: [],
        categories: [],
        prompts: [entry({ slug: "dupe" }), entry({ slug: "oud-ember" })],
      })
    );
    const { registered, server } = fakeServer("dupe");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await registerCatalogPrompts(server, () => session());

    expect(registered.map((r) => r.name)).toEqual(["oud-ember"]);
    // stderr, never stdout: naming the slug beats swallowing a real bug, and
    // stdout is reserved for the protocol.
    expect(logged).toHaveBeenCalledTimes(1);
    expect(logged.mock.calls[0][0]).toContain('skipped prompt "dupe"');
    logged.mockRestore();
  });

  it("returns the teaser and pricing link for a locked prompt", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ version: 1, tools: [], categories: [], prompts: [entry()] })
    );
    const { registered, server } = fakeServer();
    await registerCatalogPrompts(server, () => session());

    fetchMock.mockResolvedValueOnce(
      json({
        entitled: false,
        tier: "unlimited",
        teaser: "The first four lines.",
        upsell: {
          pricingUrl: "https://nightmarquee.com/pricing?ref=mcp",
          message: "Unlock every drop:",
        },
      })
    );

    const result = await registered[0].cb({});
    const text = result.messages[0].content.text;
    expect(text).toContain("The first four lines.");
    expect(text).toContain('Locked — "isola" is an Unlimited prompt.');
    expect(text).toContain("https://nightmarquee.com/pricing?ref=mcp");
  });

  it("passes brand and tool through as query parameters", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ version: 1, tools: [], categories: [], prompts: [entry()] })
    );
    const { registered, server } = fakeServer();
    await registerCatalogPrompts(server, () => session());

    fetchMock.mockResolvedValueOnce(
      json({ entitled: true, tier: "unlimited", text: "the body" })
    );

    await registered[0].cb({ brand: "Halcyon", tool: "cursor" });

    const url = String(fetchMock.mock.calls[1][0]);
    expect(url).toBe("http://api.test/api/mcp/prompt/isola?tool=cursor&brand=Halcyon");
  });

  it("degrades to readable text when the body fetch fails", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ version: 1, tools: [], categories: [], prompts: [entry()] })
    );
    const { registered, server } = fakeServer();
    await registerCatalogPrompts(server, () => session());

    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await registered[0].cb({});
    expect(result.messages[0].content.text).toContain("Couldn't reach nightmarquee.com");
  });

  it("re-reads the session on every invocation, so a mid-session sign-in lands", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ version: 1, tools: [], categories: [], prompts: [entry()] })
    );

    // Stands in for the credentials file changing under a running server.
    const stored: { token?: string } = {};
    const { registered, server } = fakeServer();
    await registerCatalogPrompts(server, () => session(stored));

    fetchMock.mockResolvedValue(
      json({ entitled: true, tier: "unlimited", text: "the body" })
    );

    await registered[0].cb({});
    stored.token = "signed-in-later";
    await registered[0].cb({});

    const headersOf = (call: number) =>
      (fetchMock.mock.calls[call][1] as { headers: Record<string, string> }).headers;
    expect(headersOf(1).authorization).toBeUndefined();
    expect(headersOf(2).authorization).toBe("Bearer signed-in-later");
  });
});
