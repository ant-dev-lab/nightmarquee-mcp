import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const binary = join(pkgRoot, "dist", "index.js");

const CATALOG = {
  version: 1,
  tools: ["lovable", "bolt", "cursor", "claude"],
  categories: [],
  prompts: [
    {
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
    },
  ],
};

let http: Server;
let base: string;

beforeAll(async () => {
  http = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(CATALOG));
  });
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(http.address() as { port: number }).port}`;
});

afterAll(
  () =>
    new Promise<void>((resolve) => {
      http.close(() => resolve());
    })
);

interface Wire {
  /** Every complete stdout line that parsed as JSON. */
  messages: Record<string, unknown>[];
  /** Every complete stdout line that did NOT parse as JSON. Must stay empty. */
  junk: string[];
  stderr: string;
}

/**
 * Speaks JSON-RPC to the built binary over real stdio and reports everything
 * the process wrote, so the caller can assert on protocol purity too.
 */
async function rpc(requests: unknown[], waitForIds: number[]): Promise<Wire> {
  const child = spawn(process.execPath, [binary], {
    env: {
      ...process.env,
      NIGHTMARQUEE_API: base,
      NIGHTMARQUEE_HOME: mkdtempSync(join(tmpdir(), "nm-stdio-")),
      NIGHTMARQUEE_NO_TELEMETRY: "1",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const messages: Record<string, unknown>[] = [];
  const junk: string[] = [];
  let stderr = "";
  // Chunk boundaries do not respect newlines, so buffer across them: splitting
  // per chunk would manufacture "junk" lines and hide real ones.
  let buffered = "";

  const consume = (line: string) => {
    if (!line.trim()) return;
    try {
      messages.push(JSON.parse(line) as Record<string, unknown>);
    } catch {
      junk.push(line);
    }
  };

  child.stdout.on("data", (chunk: Buffer) => {
    buffered += chunk.toString();
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";
    for (const line of lines) consume(line);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const exited = new Promise<void>((resolve) => child.once("close", () => resolve()));

  for (const req of requests) {
    child.stdin.write(`${JSON.stringify(req)}\n`);
  }

  const deadline = Date.now() + 10_000;
  const answered = () =>
    waitForIds.every((id) => messages.some((m) => m.id === id));
  while (!answered() && Date.now() < deadline && child.exitCode === null) {
    await new Promise((r) => setTimeout(r, 50));
  }

  child.stdin.end();
  child.kill();
  await exited;
  consume(buffered);

  return { messages, junk, stderr };
}

describe("the built binary over stdio", () => {
  it("is built before this test runs", () => {
    expect(
      existsSync(binary),
      "dist/index.js missing — run `npm run build -w nightmarquee` first"
    ).toBe(true);
  });

  it("completes a handshake and lists tools and prompts", async () => {
    const wire = await rpc(
      [
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "vitest", version: "1.0.0" },
          },
        },
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", id: 2, method: "tools/list" },
        { jsonrpc: "2.0", id: 3, method: "prompts/list" },
      ],
      [1, 2, 3]
    );

    const init = wire.messages.find((r) => r.id === 1) as {
      result?: { serverInfo?: { name?: string; version?: string } };
    };
    expect(init?.result?.serverInfo?.name, `stderr:\n${wire.stderr}`).toBe(
      "nightmarquee"
    );

    const tools = wire.messages.find((r) => r.id === 2) as {
      result?: { tools?: { name: string }[] };
    };
    expect(tools?.result?.tools?.map((t) => t.name).sort()).toEqual([
      "nightmarquee_get_prompt",
      "nightmarquee_search_prompts",
      "nightmarquee_sign_in",
      "nightmarquee_whoami",
    ]);

    // The locked entry still lists: the paid catalog living in the command
    // palette is the whole distribution bet.
    const prompts = wire.messages.find((r) => r.id === 3) as {
      result?: { prompts?: { name: string }[] };
    };
    expect(prompts?.result?.prompts?.map((p) => p.name)).toContain("isola");
  }, 20_000);

  it("writes nothing but JSON-RPC to stdout", async () => {
    const wire = await rpc(
      [
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "vitest", version: "1.0.0" },
          },
        },
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", id: 2, method: "prompts/list" },
      ],
      [1, 2]
    );

    // A stray console.log anywhere in the import graph corrupts the stream and
    // looks to the user like a broken client.
    expect(wire.junk).toEqual([]);
    expect(wire.messages.length).toBeGreaterThan(0);
    for (const message of wire.messages) {
      expect(message.jsonrpc).toBe("2.0");
    }
  }, 20_000);

  it("still serves tools when the catalog is unreachable", async () => {
    // Point at a closed port: registering zero prompts must not take the
    // connection down with it.
    const previous = base;
    base = "http://127.0.0.1:1";
    try {
      const wire = await rpc(
        [
          {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-06-18",
              capabilities: {},
              clientInfo: { name: "vitest", version: "1.0.0" },
            },
          },
          { jsonrpc: "2.0", method: "notifications/initialized" },
          { jsonrpc: "2.0", id: 2, method: "tools/list" },
          { jsonrpc: "2.0", id: 3, method: "prompts/list" },
        ],
        [1, 2, 3]
      );

      const tools = wire.messages.find((r) => r.id === 2) as {
        result?: { tools?: { name: string }[] };
      };
      expect(tools?.result?.tools?.length, `stderr:\n${wire.stderr}`).toBe(4);

      // Zero prompts means the SDK never declares the prompts capability, so
      // the client is told the method is absent. An answer either way is the
      // point: the connection survived a dead catalog.
      const prompts = wire.messages.find((r) => r.id === 3) as {
        result?: { prompts?: { name: string }[] };
        error?: { code?: number };
      };
      expect(prompts, `stderr:\n${wire.stderr}`).toBeDefined();
      expect(prompts.result?.prompts ?? []).toEqual([]);
      expect(wire.junk).toEqual([]);
    } finally {
      base = previous;
    }
  }, 20_000);

  // Declaring an outputSchema makes the SDK reject any result that lacks
  // structured content, so these calls fail loudly if a handler forgets it or
  // returns a shape the schema does not accept. That check only fires at call
  // time, which is why it is exercised over real stdio rather than unit-tested.
  it("advertises an output schema on every tool and honours it when called", async () => {
    const wire = await rpc(
      [
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "vitest", version: "1.0.0" },
          },
        },
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", id: 2, method: "tools/list" },
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "nightmarquee_search_prompts", arguments: {} },
        },
        {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: { name: "nightmarquee_whoami", arguments: {} },
        },
      ],
      [1, 2, 3, 4]
    );

    const tools = wire.messages.find((r) => r.id === 2) as {
      result?: { tools?: { name: string; outputSchema?: unknown }[] };
    };
    const withSchema = (tools?.result?.tools ?? []).filter((t) => t.outputSchema);
    expect(withSchema.length, `stderr:\n${wire.stderr}`).toBe(4);

    const search = wire.messages.find((r) => r.id === 3) as {
      result?: { structuredContent?: { total?: number; results?: { slug: string }[] } };
      error?: unknown;
    };
    expect(search?.error, `stderr:\n${wire.stderr}`).toBeUndefined();
    expect(search?.result?.structuredContent?.total).toBe(1);
    expect(search?.result?.structuredContent?.results?.[0]?.slug).toBe("isola");

    // Signed out: the structured half must still be present and well formed.
    const who = wire.messages.find((r) => r.id === 4) as {
      result?: { structuredContent?: { signedIn?: boolean; message?: string } };
      error?: unknown;
    };
    expect(who?.error, `stderr:\n${wire.stderr}`).toBeUndefined();
    expect(who?.result?.structuredContent?.signedIn).toBe(false);
    expect(who?.result?.structuredContent?.message).toMatch(/not signed in/i);

    expect(wire.junk).toEqual([]);
  }, 20_000);
});
