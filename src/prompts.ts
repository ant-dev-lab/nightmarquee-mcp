import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import { apiGet, type CatalogPrompt, type PromptBody, type Session } from "./api.js";
import { getCatalog } from "./catalog.js";
import { formatPrompt } from "./tools.js";

const TOOL_IDS = ["lovable", "bolt", "cursor", "claude"] as const;

/**
 * One MCP prompt per catalog entry, so the catalog lands in the client's
 * command palette. Locked entries still list — invoking one returns the teaser
 * and the pricing link, which is the whole distribution bet.
 *
 * A failed catalog fetch registers nothing rather than throwing: a dead network
 * should degrade the menu, not take down the client's MCP connection.
 */
export async function registerCatalogPrompts(
  server: McpServer,
  session: () => Session
): Promise<void> {
  let prompts: CatalogPrompt[];
  try {
    prompts = (await getCatalog(session())).prompts;
  } catch {
    return;
  }

  for (const prompt of prompts) {
    // registerPrompt throws on a duplicate name. One bad catalog entry must
    // cost us that entry, not the whole connection — but say so on stderr,
    // which is safe for the protocol, rather than swallowing a real bug.
    try {
      registerOne(server, session, prompt);
    } catch (err) {
      console.error(
        `nightmarquee: skipped prompt "${prompt.slug}" — ${String(err)}`
      );
    }
  }
}

function registerOne(
  server: McpServer,
  session: () => Session,
  prompt: CatalogPrompt
): void {
  server.registerPrompt(
    prompt.slug,
    {
      title: `${prompt.title} — ${prompt.tagline}`,
      description:
        prompt.tier === "free"
          ? prompt.description
          : `${prompt.description} (Unlimited)`,
      argsSchema: z.object({
        brand: z
          .string()
          .max(24)
          .optional()
          .describe("Your brand name, swapped into the prompt"),
        tool: z
          .enum(TOOL_IDS)
          .optional()
          .describe("Target tool dialect, defaults to claude"),
      }),
    },
    async ({ brand, tool }) => {
      const params = new URLSearchParams();
      if (tool) params.set("tool", tool);
      if (brand) params.set("brand", brand);
      const query = params.toString() ? `?${params}` : "";

      let body: string;
      try {
        // session() is read here, not captured at registration: a sign-in
        // mid-session must take effect without restarting the server.
        const data = await apiGet<PromptBody>(
          `/api/mcp/prompt/${encodeURIComponent(prompt.slug)}${query}`,
          session()
        );
        body = formatPrompt(data, prompt.slug);
      } catch {
        body = `Couldn't reach nightmarquee.com to fetch "${prompt.slug}". Check your connection and try again.`;
      }

      return {
        messages: [
          { role: "user" as const, content: { type: "text" as const, text: body } },
        ],
      };
    }
  );
}
