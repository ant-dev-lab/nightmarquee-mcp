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
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
function probe() {
  const msg = (id, method, params = {}) =>
    JSON.stringify({ jsonrpc: "2.0", id, method, params });
  const res = spawnSync(process.execPath, ["server/index.js"], {
    cwd: stage,
    encoding: "utf8",
    timeout: 60_000,
    input: [
      msg(1, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "publish-smithery", version: "1" },
      }),
      msg(2, "tools/list"),
      msg(3, "prompts/list"),
      "",
    ].join("\n"),
  });
  const byId = {};
  for (const line of res.stdout.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const f = JSON.parse(t);
      if (f.id) byId[f.id] = f.result;
    } catch {
      /* not a JSON-RPC frame */
    }
  }
  if (!byId[1] || !byId[2]?.tools?.length) {
    console.error("Could not read the staged server.", res.stderr || "");
    process.exit(1);
  }
  return byId;
}

// ServerCard sub-objects set additionalProperties:false, so send only what the
// schema names. tools[] requires name AND inputSchema.
const pick = (o, keys) =>
  Object.fromEntries(keys.filter((k) => o?.[k] != null).map((k) => [k, o[k]]));

const r = probe();
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
        "Art-directed website prompts delivered as slash commands in Claude Code, Claude Desktop and Cursor.",
    },
    tools: r[2].tools.map((t) =>
      pick(t, ["name", "title", "description", "inputSchema"])
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
