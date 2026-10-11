/**
 * The prompt dialects the API serves, in the site's tab order. One list for
 * the tool and the per-prompt arguments, so they cannot drift apart.
 */
export const TOOL_IDS = ["lovable", "bolt", "cursor", "claude", "codex"] as const;

/** The server picks codex for a Codex client that names no dialect. */
export const DIALECT_HELP =
  "Target tool dialect. Defaults to codex when the client is Codex, otherwise claude";

/**
 * The dialect to ask for: the one named, else codex when the client is Codex.
 * Decided here rather than left to the server's header sniff, because the
 * client header is telemetry and NIGHTMARQUEE_NO_TELEMETRY drops it.
 */
export function dialectFor(
  tool: (typeof TOOL_IDS)[number] | undefined,
  client: string
): (typeof TOOL_IDS)[number] | undefined {
  return tool ?? (client.startsWith("codex-mcp-client/") ? "codex" : undefined);
}
