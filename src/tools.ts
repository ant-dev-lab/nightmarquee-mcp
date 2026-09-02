import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import { ApiError, apiGet, type Catalog, type PromptBody, type Session } from "./api.js";
import { getCatalog } from "./catalog.js";
import { activeToken } from "./creds.js";
import { signIn } from "./device.js";

const TOOL_IDS = ["lovable", "bolt", "cursor", "claude"] as const;
const CATEGORIES = ["hero", "landing", "saas", "portfolio", "ecommerce", "3d"] as const;

const text = (value: string) => ({ content: [{ type: "text" as const, text: value }] });

/**
 * Text plus machine-readable output. Every tool declares an outputSchema, and
 * the SDK rejects a result that has one without structured content, so the two
 * always travel together.
 */
const reply = <T>(value: string, structured: T) => ({
  content: [{ type: "text" as const, text: value }],
  structuredContent: structured,
});

export interface SearchArgs {
  query?: string;
  category?: string;
  tier?: string;
  limit?: number;
}

/** The filter, shared so the text and the structured output can never disagree. */
export function matchPrompts(catalog: Catalog, args: SearchArgs) {
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

  const limit = Math.max(1, Math.min(args.limit ?? 10, 50));
  return { matches, shown: matches.slice(0, limit) };
}

/** The structured half of a search: enough to chain straight into get_prompt. */
export function searchStructured(catalog: Catalog, args: SearchArgs) {
  const { matches, shown } = matchPrompts(catalog, args);
  return {
    total: matches.length,
    results: shown.map((p) => ({
      slug: p.slug,
      title: p.title,
      tagline: p.tagline,
      category: p.category,
      tier: p.tier,
      demoUrl: p.demoUrl,
    })),
  };
}

/** The structured half of a fetch. `entitled` is the field that decides everything. */
export function promptStructured(body: PromptBody, slug: string) {
  // Coerced, not trusted: the schema requires a boolean, and a malformed
  // response would otherwise fail output validation instead of reading as
  // "not entitled", which is the safe reading anyway.
  const entitled = body.entitled === true;
  return {
    slug,
    entitled,
    tier: body.tier,
    title: body.title,
    tool: body.tool,
    text: entitled ? body.text : undefined,
    demoUrl: body.demoUrl,
    pricingUrl: entitled ? undefined : body.upsell?.pricingUrl,
  };
}

export function formatSearch(catalog: Catalog, args: SearchArgs): string {
  const { matches, shown } = matchPrompts(catalog, args);

  if (matches.length === 0) {
    return "No prompts matched. Try a broader query, or drop the category/tier filter.";
  }

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
      // All four hints, not just the true ones: a partial set reads as
      // "unspecified" to clients and scorers alike.
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      description:
        "Search the NightMarquee catalog of website build prompts by keyword, category (hero, landing, saas, portfolio, ecommerce, 3d) or tier. Returns matching slugs, taglines and demo links to pass to nightmarquee_get_prompt.",
      inputSchema: z.object({
        query: z.string().optional().describe("Free text, matched against titles, taglines and style keywords"),
        category: z
          .enum(CATEGORIES)
          .optional()
          .describe("Restrict to one section of the catalog"),
        tier: z
          .enum(["free", "unlimited"])
          .optional()
          .describe("\"free\" needs no account; \"unlimited\" needs a signed-in Unlimited plan"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("How many matches to return, 1 to 50, default 10"),
      }),
      outputSchema: z.object({
        total: z.number().int().describe("Matches before `limit` was applied"),
        results: z
          .array(
            z.object({
              slug: z.string().describe("Pass to nightmarquee_get_prompt"),
              title: z.string(),
              tagline: z.string(),
              category: z.string(),
              tier: z.enum(["free", "unlimited"]),
              demoUrl: z.string().describe("Live, scrollable build"),
            })
          )
          .describe("Matches, capped at `limit`"),
        error: z.string().optional().describe("Set only when the catalog could not be reached"),
      }),
    },
    async (args) => {
      try {
        const catalog = await getCatalog(session());
        return reply(formatSearch(catalog, args), searchStructured(catalog, args));
      } catch (err) {
        const message = friendly(err, "fetching the catalog");
        return reply(message, { total: 0, results: [], error: message });
      }
    }
  );

  server.registerTool(
    "nightmarquee_get_prompt",
    {
      title: "Get a NightMarquee prompt",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      description:
        "Fetch the full build prompt for one NightMarquee design, tuned for the target tool. Free prompts need no account; Unlimited prompts need one (run nightmarquee_sign_in).",
      inputSchema: z.object({
        // A free slug, deliberately: a model that reaches for the example as a
        // default should land on something it can actually fetch.
        slug: z.string().describe("Prompt slug, e.g. \"glasshouse-nine\" — from nightmarquee_search_prompts"),
        tool: z.enum(TOOL_IDS).optional().describe("Target tool dialect, defaults to claude"),
        brand: z.string().max(24).optional().describe("Swap the fictional brand for this name"),
      }),
      outputSchema: z.object({
        slug: z.string(),
        entitled: z
          .boolean()
          .describe("Whether the full build text is included; false means locked or missing"),
        tier: z.string().optional(),
        title: z.string().optional(),
        tool: z.string().optional().describe("Dialect the text was written for"),
        text: z.string().optional().describe("The full build prompt, present only when entitled"),
        demoUrl: z.string().optional(),
        pricingUrl: z.string().optional().describe("Set when the prompt is locked"),
        error: z.string().optional().describe("Set when the prompt could not be fetched"),
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
        return reply(formatPrompt(body, slug), promptStructured(body, slug));
      } catch (err) {
        const missing = (message: string) =>
          reply(message, { slug, entitled: false, error: message });

        if (err instanceof ApiError && err.status === 404) {
          try {
            const near = suggestSlugs(await getCatalog(session()), slug);
            return missing(
              near.length
                ? `No prompt called "${slug}". Did you mean: ${near.join(", ")}?`
                : `No prompt called "${slug}". Run nightmarquee_search_prompts to see what's available.`
            );
          } catch {
            return missing(`No prompt called "${slug}".`);
          }
        }
        return missing(friendly(err, `fetching "${slug}"`));
      }
    }
  );

  server.registerTool(
    "nightmarquee_sign_in",
    {
      title: "Sign in to NightMarquee",
      // Mints a credential and writes it to disk: not read-only, so Claude
      // asks before every run. Not destructive either — it creates, never deletes.
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        // Re-running mints a new code rather than repeating the last one.
        idempotentHint: false,
        openWorldHint: true,
      },
      description:
        "Connect a NightMarquee account so Unlimited prompts work here. Shows a short code to approve in the browser. Run it again after approving to finish.",
      outputSchema: z.object({
        status: z
          .enum(["approved", "waiting", "expired", "unavailable"])
          .describe("Run the tool again while this is \"waiting\""),
        email: z.string().nullable().optional().describe("Set once approved"),
        userCode: z.string().optional().describe("The code to approve in the browser"),
        verificationUri: z.string().optional().describe("Where to approve it"),
        message: z.string().describe("The same text shown to the human"),
      }),
    },
    async () => {
      const result = await signIn(session());
      return reply(result.message, result);
    }
  );

  server.registerTool(
    "nightmarquee_whoami",
    {
      title: "NightMarquee account status",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      description: "Show which NightMarquee account is connected and what it can reach.",
      outputSchema: z.object({
        signedIn: z.boolean(),
        email: z.string().nullable().optional(),
        free: z.number().int().optional().describe("Prompts readable without an account"),
        unlimited: z.number().int().optional().describe("Prompts that need Unlimited"),
        message: z.string(),
        error: z.string().optional(),
      }),
    },
    async () => {
      const current = session();
      if (!activeToken(current.creds)) {
        const message =
          "Not signed in. Free prompts work as-is; run nightmarquee_sign_in to unlock the rest.";
        return reply(message, { signedIn: false, message });
      }
      try {
        const catalog = await getCatalog(current);
        const free = catalog.prompts.filter((p) => p.tier === "free").length;
        const paid = catalog.prompts.length - free;
        const message = [
          current.creds.email ? `Signed in as ${current.creds.email}.` : "Signed in.",
          `Catalog: ${free} free, ${paid} Unlimited.`,
          "Fetch any of them with nightmarquee_get_prompt — locked ones will say so.",
        ].join("\n");
        return reply(message, {
          signedIn: true,
          email: current.creds.email,
          free,
          unlimited: paid,
          message,
        });
      } catch (err) {
        const message = friendly(err, "checking your account");
        return reply(message, { signedIn: true, email: current.creds.email, message, error: message });
      }
    }
  );
}
