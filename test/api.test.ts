import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet, apiPost, apiBase } from "../src/api.js";
import { getCatalog, resetCatalogCache } from "../src/catalog.js";

const session = { creds: { installId: "abc-123", token: "nm_live_t" }, client: "claude-code/1.0" };

// Typed as fetch so `mock.calls[0][1]` is a RequestInit rather than an empty
// args tuple; an untyped `vi.fn(async () => ...)` does not compile at the
// index site.
const ok = (body: unknown) =>
  vi.fn<(input: string, init: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify(body), { status: 200 })
  );

beforeEach(() => {
  resetCatalogCache();
  delete process.env.NIGHTMARQUEE_API;
  delete process.env.NIGHTMARQUEE_NO_TELEMETRY;
  delete process.env.NIGHTMARQUEE_TOKEN;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiBase", () => {
  it("defaults to production and honours an override", () => {
    expect(apiBase()).toBe("https://nightmarquee.com");
    process.env.NIGHTMARQUEE_API = "http://localhost:3000";
    expect(apiBase()).toBe("http://localhost:3000");
  });
});

describe("apiGet", () => {
  it("sends auth and telemetry headers", async () => {
    const fetchMock = ok({ hi: true });
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/mcp/catalog", session);

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("authorization")).toBe("Bearer nm_live_t");
    expect(headers.get("x-nm-install")).toBe("abc-123");
    expect(headers.get("x-nm-client")).toBe("claude-code/1.0");
    expect(headers.get("x-nm-version")).toBeTruthy();
    // Pin the exact set: an added header cannot leak anything past the suite.
    expect([...headers.keys()].sort()).toEqual([
      "accept",
      "authorization",
      "x-nm-client",
      "x-nm-install",
      "x-nm-version",
    ]);
  });

  it("omits telemetry headers when opted out, but keeps auth", async () => {
    process.env.NIGHTMARQUEE_NO_TELEMETRY = "1";
    const fetchMock = ok({});
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/mcp/catalog", session);

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("x-nm-install")).toBeNull();
    expect(headers.get("x-nm-client")).toBeNull();
    expect(headers.get("authorization")).toBe("Bearer nm_live_t");
  });

  it("throws ApiError carrying the status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    await expect(apiGet("/x", session)).rejects.toMatchObject({ status: 404 });
    await expect(apiGet("/x", session)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("apiPost", () => {
  it("sends auth, telemetry and content-type headers, and nothing else", async () => {
    const fetchMock = ok({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await apiPost("/api/mcp/device/start", { tool: "claude" }, session);

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("authorization")).toBe("Bearer nm_live_t");
    expect(headers.get("x-nm-install")).toBe("abc-123");
    expect(headers.get("x-nm-client")).toBe("claude-code/1.0");
    expect(headers.get("x-nm-version")).toBeTruthy();
    expect(headers.get("content-type")).toBe("application/json");
    expect([...headers.keys()].sort()).toEqual([
      "accept",
      "authorization",
      "content-type",
      "x-nm-client",
      "x-nm-install",
      "x-nm-version",
    ]);
  });

  it("omits telemetry headers when opted out, but keeps auth", async () => {
    process.env.NIGHTMARQUEE_NO_TELEMETRY = "1";
    const fetchMock = ok({});
    vi.stubGlobal("fetch", fetchMock);

    await apiPost("/api/mcp/device/poll", { deviceCode: "dc_1" }, session);

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("x-nm-install")).toBeNull();
    expect(headers.get("x-nm-client")).toBeNull();
    // Opting out of analytics must never opt you out of your entitlement.
    expect(headers.get("authorization")).toBe("Bearer nm_live_t");
    expect([...headers.keys()].sort()).toEqual([
      "accept",
      "authorization",
      "content-type",
      "x-nm-version",
    ]);
  });

  it("sends the body as JSON and never as a header", async () => {
    const fetchMock = ok({});
    vi.stubGlobal("fetch", fetchMock);

    const body = { deviceCode: "dc_secret", tool: "claude" };
    await apiPost("/api/mcp/device/poll", body, session);

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(body));
    const headers = new Headers(init.headers);
    for (const [, value] of headers) expect(value).not.toContain("dc_secret");
  });

  it("throws ApiError carrying the status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 400 })));
    await expect(apiPost("/x", {}, session)).rejects.toMatchObject({ status: 400 });
    await expect(apiPost("/x", {}, session)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("getCatalog", () => {
  const catalog = { version: 1, tools: ["claude"], categories: [], prompts: [] };

  it("caches within the TTL and refetches after it", async () => {
    const fetchMock = ok(catalog);
    vi.stubGlobal("fetch", fetchMock);

    await getCatalog(session);
    await getCatalog(session);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    vi.advanceTimersByTime(6 * 60 * 1000);
    await getCatalog(session);
    vi.useRealTimers();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("propagates failure so callers can degrade", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    await expect(getCatalog(session)).rejects.toThrow();
  });
});
