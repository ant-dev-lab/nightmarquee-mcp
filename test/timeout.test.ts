import { createServer, type Server, type Socket } from "node:net";
import type { McpServer } from "@modelcontextprotocol/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  apiGet,
  requestTimeoutMs,
  type Session,
} from "../src/api.js";
import { getCatalog, resetCatalogCache } from "../src/catalog.js";
import { registerTools } from "../src/tools.js";

/**
 * A server that completes the TCP handshake and then says nothing, ever. This
 * is the failure a refused connection does not cover: `fetch` has a live
 * socket, so without a bound it waits on Node's ~300s default — and the
 * catalog fetch runs inside the `serveStdio` factory, so the user's editor
 * just reports that the MCP server failed to start.
 */
let silent: Server;
let sockets: Socket[] = [];
let base: string;

beforeAll(async () => {
  silent = createServer((socket) => {
    // Hold the connection open and never write a byte.
    sockets.push(socket);
    socket.on("error", () => {});
  });
  await new Promise<void>((r) => silent.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(silent.address() as { port: number }).port}`;
});

afterAll(
  () =>
    new Promise<void>((resolve) => {
      for (const socket of sockets) socket.destroy();
      sockets = [];
      silent.close(() => resolve());
    })
);

const session = (): Session => ({
  creds: { installId: "install-1" },
  client: "vitest/1.0.0",
});

/** Well under the vitest timeouts below, so a hang fails loudly instead of stalling. */
const TEST_TIMEOUT_MS = 300;

beforeEach(() => {
  resetCatalogCache();
  process.env.NIGHTMARQUEE_API = base;
  process.env.NIGHTMARQUEE_TIMEOUT_MS = String(TEST_TIMEOUT_MS);
  process.env.NIGHTMARQUEE_NO_TELEMETRY = "1";
});

afterEach(() => {
  delete process.env.NIGHTMARQUEE_API;
  delete process.env.NIGHTMARQUEE_TIMEOUT_MS;
  delete process.env.NIGHTMARQUEE_NO_TELEMETRY;
});

describe("requestTimeoutMs", () => {
  it("defaults to ten seconds", () => {
    delete process.env.NIGHTMARQUEE_TIMEOUT_MS;
    expect(requestTimeoutMs()).toBe(DEFAULT_TIMEOUT_MS);
    expect(DEFAULT_TIMEOUT_MS).toBe(10_000);
  });

  it("honours an override and ignores garbage", () => {
    process.env.NIGHTMARQUEE_TIMEOUT_MS = "1500";
    expect(requestTimeoutMs()).toBe(1500);

    for (const bad of ["", "soon", "0", "-1", "NaN"]) {
      process.env.NIGHTMARQUEE_TIMEOUT_MS = bad;
      expect(requestTimeoutMs(), `for ${JSON.stringify(bad)}`).toBe(
        DEFAULT_TIMEOUT_MS
      );
    }
  });

  it("clamps an absurd override instead of letting AbortSignal reject it", () => {
    // Past 2^32−1, AbortSignal.timeout throws a synchronous RangeError.
    for (const huge of ["4294967296", "999999999999", "1e30", "Infinity"]) {
      process.env.NIGHTMARQUEE_TIMEOUT_MS = huge;
      const ms = requestTimeoutMs();
      expect(ms, `for ${huge}`).toBeLessThanOrEqual(MAX_TIMEOUT_MS);
      expect(ms, `for ${huge}`).toBeGreaterThanOrEqual(DEFAULT_TIMEOUT_MS);
      // The value the clamp produces is one AbortSignal actually accepts.
      expect(() => AbortSignal.timeout(ms)).not.toThrow();
      expect(AbortSignal.timeout(ms).aborted).toBe(false);
    }
  });
});

describe("an absurd NIGHTMARQUEE_TIMEOUT_MS", () => {
  it(
    "still makes a long-waiting request, not an instant failure",
    async () => {
      process.env.NIGHTMARQUEE_TIMEOUT_MS = "99999999999";
      let settled: unknown = "pending";
      const inflight = apiGet("/api/mcp/catalog", session()).then(
        (v) => (settled = v),
        (e) => (settled = e)
      );
      // Unclamped, AbortSignal.timeout would have thrown a RangeError before
      // this line — apiGet would already be rejected.
      await new Promise((r) => setTimeout(r, TEST_TIMEOUT_MS));
      expect(settled).toBe("pending");
      // Let afterAll's socket teardown settle it; don't leave it unhandled.
      void inflight;
    },
    5_000
  );
});

describe("a server that accepts the connection and never answers", () => {
  it(
    "makes apiGet reject rather than hang",
    async () => {
      const started = Date.now();
      await expect(apiGet("/api/mcp/catalog", session())).rejects.toThrow();
      // The bound is what stopped it, not the test runner giving up.
      expect(Date.now() - started).toBeLessThan(TEST_TIMEOUT_MS * 10);
    },
    5_000
  );

  it(
    "rejects with a TimeoutError, which is what friendly() reads as unreachable",
    async () => {
      const err = await apiGet("/api/mcp/catalog", session()).catch(
        (e: unknown) => e
      );
      // Not an ApiError, so friendly() falls to the connection message rather
      // than the 5xx one — and it is an ordinary rejection, so the callbacks'
      // catch blocks see it instead of it escaping as an unhandled rejection.
      expect((err as Error).name).toBe("TimeoutError");
      expect(err).toBeInstanceOf(Error);
    },
    5_000
  );

  it(
    "makes getCatalog reject rather than hang",
    async () => {
      await expect(getCatalog(session())).rejects.toThrow();
    },
    5_000
  );

  it(
    "surfaces readable text from a tool call instead of a raw AbortError",
    async () => {
      const calls: Record<
        string,
        (args: Record<string, unknown>) => Promise<{ content: { text: string }[] }>
      > = {};
      const fake = {
        registerTool(
          name: string,
          _config: unknown,
          cb: (args: Record<string, unknown>) => Promise<{ content: { text: string }[] }>
        ) {
          calls[name] = cb;
          return {} as never;
        },
      } as unknown as McpServer;

      registerTools(fake, session);

      const search = await calls.nightmarquee_search_prompts({});
      expect(search.content[0].text).toBe(
        "Couldn't reach nightmarquee.com fetching the catalog. Check your connection and try again."
      );

      const get = await calls.nightmarquee_get_prompt({ slug: "isola" });
      expect(get.content[0].text).toBe(
        'Couldn\'t reach nightmarquee.com fetching "isola". Check your connection and try again.'
      );
    },
    10_000
  );
});
