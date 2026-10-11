#!/usr/bin/env node
/**
 * Publishes the MCPB bundle to Smithery.
 *
 * `smithery mcp publish <bundle> -n <name>` does not work for this server. It
 * builds the release's server card from the MCPB manifest, and the MCPB schema
 * forbids `inputSchema` on a manifest tool while Smithery's ServerCard requires
 * it, so the CLI sends four tools with no schema and the API answers with four
 * copies of "Invalid input: expected object, received undefined". The two specs
 * disagree and the CLI sits on the fault line.
 *
 * So we build the server card ourselves, from the staged server rather than
 * from anything hand-written: initialize gives serverInfo, and tools/list and
 * prompts/list give the real schemas. Nothing here can drift from what the
 * server actually exposes.
 *
 * Requires `npx smithery auth login` first. Run after `npm run build:mcpb`.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { probeServer } from "./read-tools.mjs";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stage = join(pkgRoot, "build", "stage");
const bundle = join(pkgRoot, "build", "nightmarquee.mcpb");
const QUALIFIED = "ant-dev-lab/nightmarquee";

if (!existsSync(bundle) || !existsSync(stage)) {
  console.error("Run `npm run build:mcpb -w nightmarquee` first.");
  process.exit(1);
}

const settings = join(
  homedir(),
  "Library",
  "Application Support",
  "smithery",
  "settings.json"
);
if (!existsSync(settings)) {
  console.error("Not logged in. Run `npx smithery auth login`.");
  process.exit(1);
}
const apiKey = JSON.parse(readFileSync(settings, "utf8")).apiKey;
if (!apiKey) {
  console.error("No API key in Smithery settings. Run `npx smithery auth login`.");
  process.exit(1);
}

/** Drive the staged server over stdio and read back what it really exposes. */
async function probe() {
  try {
    const r = await probeServer(join(stage, "server", "index.js"), ["tools/list", "prompts/list"], {
      cwd: stage,
    });
    if (!r.initialize || !r["tools/list"]?.tools?.length) throw new Error("no tools");
    return { 1: r.initialize, 2: r["tools/list"], 3: r["prompts/list"] };
  } catch (err) {
    console.error("Could not read the staged server.", String(err));
    process.exit(1);
  }
}

// ServerCard sub-objects set additionalProperties:false, so send only what the
// schema names. tools[] requires name AND inputSchema.
const pick = (o, keys) =>
  Object.fromEntries(keys.filter((k) => o?.[k] != null).map((k) => [k, o[k]]));

const r = await probe();
const payload = {
  type: "stdio",
  runtime: "node",
  serverCard: {
    serverInfo: {
      name: r[1].serverInfo.name,
      version: r[1].serverInfo.version,
      title: "NightMarquee",
      websiteUrl: "https://nightmarquee.com",
      description:
        "Art-directed website prompts, with the footage their demos play, as slash commands in Claude Code, Claude Desktop, Cursor and Codex.",
    },
    tools: r[2].tools.map((t) =>
      pick(t, [
        "name",
        "title",
        "description",
        "inputSchema",
        "outputSchema",
        // The server sets these and Smithery scores them; forgetting to
        // forward them silently costs points on a listing that looks fine.
        "annotations",
      ])
    ),
    prompts: (r[3]?.prompts ?? []).map((p) =>
      pick(p, ["name", "title", "description", "arguments"])
    ),
  },
};

const form = new FormData();
form.append("payload", JSON.stringify(payload));
form.append(
  "bundle",
  new Blob([readFileSync(bundle)], { type: "application/octet-stream" }),
  "nightmarquee.mcpb"
);

const res = await fetch(
  `https://api.smithery.ai/servers/${encodeURIComponent(QUALIFIED)}/releases`,
  { method: "PUT", headers: { Authorization: `Bearer ${apiKey}` }, body: form }
);
const body = await res.text();
if (!res.ok) {
  console.error(`Publish failed: ${res.status} ${body}`);
  process.exit(1);
}
console.log(
  `Published ${QUALIFIED} v${payload.serverCard.serverInfo.version} ` +
    `(${payload.serverCard.tools.length} tools, ${payload.serverCard.prompts.length} prompts)`
);
console.log(body);
console.log(`https://smithery.ai/server/${QUALIFIED}`);
