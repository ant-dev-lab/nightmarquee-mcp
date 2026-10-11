import { createServer, type Server } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readTools } from "../scripts/read-tools.mjs";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

let http: Server;
let base: string;

beforeAll(async () => {
  http = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ version: 1, tools: [], categories: [], prompts: [] }));
  });
  await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(http.address() as { port: number }).port}`;
});

afterAll(() => new Promise<void>((resolve) => http.close(() => resolve())));

// The MCPB build declares its tools by asking the built server. The SDK from
// 2.3 on stops at end of input before answering, so the probe must keep stdin
// open until the reply arrives.
describe("readTools", () => {
  it("reads every tool from the built server", async () => {
    const tools = await readTools(join(pkgRoot, "dist", "index.js"), {
      NIGHTMARQUEE_API: base,
      NIGHTMARQUEE_HOME: mkdtempSync(join(tmpdir(), "nm-tools-")),
      NIGHTMARQUEE_NO_TELEMETRY: "1",
    });
    expect(tools.map((t: { name: string }) => t.name).sort()).toEqual([
      "nightmarquee_get_footage",
      "nightmarquee_get_prompt",
      "nightmarquee_search_prompts",
      "nightmarquee_sign_in",
      "nightmarquee_whoami",
    ]);
    for (const tool of tools) expect(Object.keys(tool).sort()).toEqual(["description", "name"]);
  }, 20_000);
});
