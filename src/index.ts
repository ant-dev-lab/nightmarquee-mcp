#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import type { Session } from "./api.js";
import { loadCreds } from "./creds.js";
import { registerCatalogPrompts } from "./prompts.js";
import { registerTools } from "./tools.js";
import { PACKAGE_VERSION } from "./version.js";

serveStdio(async () => {
  const server = new McpServer({
    name: "nightmarquee",
    version: PACKAGE_VERSION,
  });

  // Read fresh each call: sign-in during the session must take effect without
  // a restart. Neither half throws, which matters — some callers read the
  // session outside their own try/catch.
  const session = (): Session => ({
    creds: loadCreds(),
    client: clientLabel(server),
  });

  registerTools(server, session);
  await registerCatalogPrompts(server, session);

  return server;
});

/**
 * Best-effort client identification for telemetry. `Server.getClientVersion()`
 * is a real public accessor (deprecated in favour of the per-request handler
 * context, but functional and returning `undefined` before the handshake
 * settles). Kept defensive anyway: this is not load-bearing, and an unknown
 * client must never break startup.
 */
function clientLabel(server: McpServer): string {
  try {
    const info = server.server.getClientVersion();
    if (!info?.name) return "unknown";
    return info.version ? `${info.name}/${info.version}` : info.name;
  } catch {
    return "unknown";
  }
}
