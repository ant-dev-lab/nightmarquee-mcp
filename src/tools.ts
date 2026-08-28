import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import { ApiError, apiGet, type Catalog, type PromptBody, type Session } from "./api.js";
import { getCatalog } from "./catalog.js";
import { activeToken } from "./creds.js";
import { signIn } from "./device.js";

const TOOL_IDS = ["lovable", "bolt", "cursor", "claude"] as const;
const CATEGORIES = ["hero", "landing", "saas", "portfolio", "ecommerce", "3d"] as const;

const text = (value: string) => ({ content: [{ type: "text" as const, text: value }] });

export function formatSearch(
  catalog: Catalog,
  args: { query?: string; category?: string; tier?: string; limit?: number }
): string {
  const q = args.query?.trim().toLowerCase();

  const matches = catalog.prompts.filter((p) => {
    if (args.category && p.category !== args.category) return false;
    if (args.tier && p.tier !== args.tier) return false;
    if (!q) return true;
    return [p.slug, p.title, p.tagline, p.description, p.category, ...p.chips]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  if (matches.length === 0) {
    return "No prompts matched. Try a broader query, or drop the category/tier filter.";
  }

  const limit = Math.max(1, Math.min(args.limit ?? 10, 50));
  const shown = matches.slice(0, limit);

  const lines = shown.map((p) =>
    [
      `${p.slug} — ${p.title}`,
      `  ${p.tagline}`,
      `  ${p.tier === "free" ? "free" : "unlimited"} · ${p.category} · demo: ${p.demoUrl}`,
    ].join("\n")
  );

  const withheld = matches.length - shown.length;
  if (withheld > 0) {
    lines.push(`\n(${withheld} more not shown — raise \`limit\` or narrow the query.)`);
  }

  return `${lines.join("\n\n")}\n\nFetch one with nightmarquee_get_prompt(slug).`;
}

export function formatPrompt(body: PromptBody, slug: string): string {
  if (body.entitled && body.text) {
    const footer = body.demoUrl ? `\n\n---\nLive demo: ${body.demoUrl}` : "";
    return `${body.text}${footer}`;
  }

  return [
    body.teaser ?? "",
    "",
    `Locked — "${slug}" is an Unlimited prompt.`,
    body.upsell?.message ?? "Unlock every drop:",
    body.upsell?.pricingUrl ?? "https://nightmarquee.com/pricing?ref=mcp",
  ]
    .join("\n")
    .trim();
}

/**
 * Levenshtein distance, abandoned once it is certainly over `max` — the slug
 * list is short and we only care about "close", never how far away a miss is.
 */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      row.push(value);
      if (value < best) best = value;
    }
    // Every remaining row can only grow, so a whole row above `max` is final.
    if (best > max) return max + 1;
    prev = row;
  }

  return prev[b.length];
}

/** Cheap near-miss finder: substring either way, or a typo or two — no fuzzy library needed. */
export function suggestSlugs(catalog: Catalog, slug: string): string[] {
  const needle = slug.toLowerCase();
  return catalog.prompts
    .map((p) => p.slug)
    .filter(
      (s) => s.includes(needle) || needle.includes(s) || editDistance(s, needle, 2) <= 2
    )
    .slice(0, 3);
}

/** Every failure returns readable text — a thrown MCP error never reaches the human. */
function friendly(err: unknown, action: string): string {
  if (err instanceof ApiError && err.status >= 500) {
    return `nightmarquee.com had a problem ${action}. Try again in a moment.`;
  }
  return `Couldn't reach nightmarquee.com ${action}. Check your connection and try again.`;
}

export function registerTools(server: McpServer, session: () => Session): void {
  server.registerTool(
    "nightmarquee_search_prompts",
    {
      title: "Search NightMarquee prompts",
      description:
        "Browse the NightMarquee catalog of cinematic website prompts (hero sections, landing pages, SaaS, portfolio, e-commerce, 3D/WebGL). Returns slugs to pass to nightmarquee_get_prompt. Use this whenever the user wants a good-looking website, landing page or hero section and hasn't specified a design.",
      inputSchema: z.object({
        query: z.string().optional().describe("Free text, matched against titles, taglines and style keywords"),
        category: z.enum(CATEGORIES).optional(),
        tier: z.enum(["free", "unlimited"]).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async (args) => {
      try {
        return text(formatSearch(await getCatalog(session()), args));
      } catch (err) {
        return text(friendly(err, "fetching the catalog"));
      }
    }
  );

  server.registerTool(
    "nightmarquee_get_prompt",
    {
      title: "Get a NightMarquee prompt",
      description:
        "Fetch the full build prompt for one NightMarquee design, tuned for the target tool. Free prompts need no account; Unlimited prompts need one (run nightmarquee_sign_in).",
      inputSchema: z.object({
        // A free slug, deliberately: a model that reaches for the example as a
        // default should land on something it can actually fetch.
        slug: z.string().describe("Prompt slug, e.g. \"glasshouse-nine\" — from nightmarquee_search_prompts"),
        tool: z.enum(TOOL_IDS).optional().describe("Target tool dialect, defaults to claude"),
        brand: z.string().max(24).optional().describe("Swap the fictional brand for this name"),
      }),
    },
    async ({ slug, tool, brand }) => {
      const params = new URLSearchParams();
      if (tool) params.set("tool", tool);
      if (brand) params.set("brand", brand);
      const query = params.toString() ? `?${params}` : "";

      try {
        const body = await apiGet<PromptBody>(
          `/api/mcp/prompt/${encodeURIComponent(slug)}${query}`,
          session()
        );
        return text(formatPrompt(body, slug));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          try {
            const near = suggestSlugs(await getCatalog(session()), slug);
            return text(
              near.length
                ? `No prompt called "${slug}". Did you mean: ${near.join(", ")}?`
                : `No prompt called "${slug}". Run nightmarquee_search_prompts to see what's available.`
            );
          } catch {
            return text(`No prompt called "${slug}".`);
          }
        }
        return text(friendly(err, `fetching "${slug}"`));
      }
    }
  );

  server.registerTool(
    "nightmarquee_sign_in",
    {
      title: "Sign in to NightMarquee",
      description:
        "Connect a NightMarquee account so Unlimited prompts work here. Shows a short code to approve in the browser. Run it again after approving to finish.",
    },
    async () => text((await signIn(session())).message)
  );

  server.registerTool(
    "nightmarquee_whoami",
    {
      title: "NightMarquee account status",
      description: "Show which NightMarquee account is connected and what it can reach.",
    },
    async () => {
      const current = session();
      if (!activeToken(current.creds)) {
        return text(
          "Not signed in. Free prompts work as-is; run nightmarquee_sign_in to unlock the rest."
        );
      }
      try {
        const catalog = await getCatalog(current);
        const free = catalog.prompts.filter((p) => p.tier === "free").length;
        const paid = catalog.prompts.length - free;
        return text(
          [
            current.creds.email ? `Signed in as ${current.creds.email}.` : "Signed in.",
            `Catalog: ${free} free, ${paid} Unlimited.`,
            "Fetch any of them with nightmarquee_get_prompt — locked ones will say so.",
          ].join("\n")
        );
      } catch (err) {
        return text(friendly(err, "checking your account"));
      }
    }
  );
}
