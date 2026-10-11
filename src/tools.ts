import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import {
  ApiError,
  apiGet,
  type Catalog,
  type FootageLink,
  type PromptBody,
  type Session,
} from "./api.js";
import { getCatalog } from "./catalog.js";
import { activeToken } from "./creds.js";
import { signIn } from "./device.js";
import { DIALECT_HELP, TOOL_IDS, dialectFor } from "./dialects.js";

const CATEGORIES = ["hero", "landing", "saas", "portfolio", "ecommerce", "3d", "mobile"] as const;

/** One clip with its signed link, as get_prompt and get_footage both return it. */
const FOOTAGE_LIST = z.array(
  z.object({
    name: z.string().describe("Save the file under this name, in public/"),
    role: z.string().describe("What the clip shows and how the demo uses it"),
    seconds: z.number(),
    bytes: z.number(),
    url: z.string().describe("Signed download link, valid for footageExpiresInSeconds"),
  })
);

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

/** A plain file name: no folders, no leading dot, nothing a shell would split. */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

function isHttps(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The clips an entitled response carries, keeping only well-formed ones. The
 * agent saves each under its name, so a name is a path on the user's disk:
 * the server builds them from its own pack list, but the package does not
 * take that on trust, and a malformed entry must not fail output validation.
 */
export function footageLinks(body: PromptBody): FootageLink[] {
  return body.entitled === true ? safeClips(body.footage) : [];
}

function safeClips(raw: unknown): FootageLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((clip: unknown) => {
    const c = clip as Partial<FootageLink> | null;
    if (!c || typeof c !== "object") return [];
    if (typeof c.name !== "string" || !SAFE_NAME.test(c.name)) return [];
    if (typeof c.role !== "string" || !isCount(c.seconds) || !isCount(c.bytes) || !isHttps(c.url)) return [];
    return [{ name: c.name, role: c.role, seconds: c.seconds, bytes: c.bytes, url: c.url }];
  });
}

/** The structured half of a fetch. `entitled` is the field that decides everything. */
export function promptStructured(body: PromptBody, slug: string) {
  // Coerced, not trusted: the schema requires a boolean, and a malformed
  // response would otherwise fail output validation instead of reading as
  // "not entitled", which is the safe reading anyway.
  const entitled = body.entitled === true;
  const footage = footageLinks(body);
  return {
    slug,
    entitled,
    tier: body.tier,
    title: body.title,
    tool: body.tool,
    text: entitled ? body.text : undefined,
    demoUrl: body.demoUrl,
    pricingUrl: entitled ? undefined : body.upsell?.pricingUrl,
    footage: footage.length ? footage : undefined,
    footageExpiresInSeconds:
      footage.length && isCount(body.footageExpiresInSeconds) ? body.footageExpiresInSeconds : undefined,
    footageMessage:
      entitled && !footage.length && typeof body.footageMessage === "string" ? body.footageMessage : undefined,
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

/**
 * What the agent should do with the footage: the files go where the build
 * expects them before it starts, while the links still work. Shared by
 * get_prompt and get_footage, so both give the same steps.
 */
function footageSteps(clips: FootageLink[], expiresInSeconds: unknown, slug: string): string {
  const seconds = isCount(expiresInSeconds) ? expiresInSeconds : 600;
  const minutes = Math.max(1, Math.round(seconds / 60));
  const lines = clips.map(
    (c) => `- ${c.name}: ${c.role}, ${c.seconds}s, ${(c.bytes / 1_000_000).toFixed(1)} MB\n  ${c.url}`
  );
  return [
    `Footage pack: the clips this demo plays. The links expire in ${minutes} minutes.`,
    "Download each file into public/ under the name shown (for a single index.html with no build step, next to index.html), then build. Quote each link in the shell, because it contains & characters:",
    `curl -fL --create-dirs -o public/${clips[0].name} "<link for ${clips[0].name}>"`,
    `If the links have expired, run nightmarquee_get_footage(slug: "${slug}") for fresh ones.`,
    "",
    ...lines,
  ].join("\n");
}

function formatFootage(body: PromptBody, slug: string): string {
  const clips = footageLinks(body);
  if (clips.length === 0) {
    return typeof body.footageMessage === "string" ? `\n\n---\nFootage: ${body.footageMessage}` : "";
  }
  return `\n\n---\n${footageSteps(clips, body.footageExpiresInSeconds, slug)}`;
}

const PRICING_URL = "https://nightmarquee.com/pricing?ref=mcp";

export interface FootageResult {
  slug: string;
  footage?: FootageLink[];
  footageExpiresInSeconds?: number;
  /** Why there are no links, when the answer is about access rather than a failure. */
  message?: string;
  pricingUrl?: string;
  error?: string;
}

/**
 * Fresh links for one prompt's footage, without fetching the prompt again.
 * The site decides who may have them; this only words its answer.
 */
export async function fetchFootage(
  slug: string,
  session: Session
): Promise<{ text: string; structured: FootageResult }> {
  const answer = (text: string, extra: Omit<FootageResult, "slug"> = {}) => ({
    text,
    structured: { slug, ...extra },
  });

  let body: { expiresInSeconds?: unknown; clips?: unknown };
  try {
    body = await apiGet(`/api/footage/${encodeURIComponent(slug)}`, session);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    const access = (message: string, extra: Omit<FootageResult, "slug"> = {}) =>
      answer(message, { message, ...extra });
    if (status === 401) {
      return access(
        `"${slug}" has footage. Run nightmarquee_sign_in, then try again: a free account covers a free prompt's footage, the rest need Unlimited.`
      );
    }
    if (status === 403) {
      return access(`The footage of "${slug}" comes with Unlimited: ${PRICING_URL}`, { pricingUrl: PRICING_URL });
    }
    if (status === 404) {
      return access(`No footage for "${slug}": the prompt does not exist or its demo plays none.`);
    }
    if (status === 429) {
      return access("This account asked for too many footage packs this hour. Try again in an hour.");
    }
    const message = friendly(err, `fetching the footage of "${slug}"`);
    return answer(message, { error: message });
  }

  const clips = safeClips(body.clips);
  if (clips.length === 0) {
    const message = `nightmarquee.com sent no usable footage links for "${slug}". Try again in a moment.`;
    return answer(message, { error: message });
  }
  return answer(footageSteps(clips, body.expiresInSeconds, slug), {
    footage: clips,
    footageExpiresInSeconds: isCount(body.expiresInSeconds) ? body.expiresInSeconds : undefined,
  });
}

export function formatPrompt(body: PromptBody, slug: string): string {
  if (body.entitled && body.text) {
    const footer = body.demoUrl ? `\n\n---\nLive demo: ${body.demoUrl}` : "";
    return `${body.text}${formatFootage(body, slug)}${footer}`;
  }

  return [
    body.teaser ?? "",
    "",
    `Locked — "${slug}" is an Unlimited prompt.`,
    body.upsell?.message ?? "Unlock every drop:",
    body.upsell?.pricingUrl ?? PRICING_URL,
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
        "Search the NightMarquee catalog of website and mobile app build prompts by keyword, category (hero, landing, saas, portfolio, ecommerce, 3d, mobile) or tier. Returns matching slugs, taglines and demo links to pass to nightmarquee_get_prompt.",
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
        "Fetch the full build prompt for one NightMarquee design, tuned for the target tool. When the account may download the demo's footage, the result also lists a short-lived link per clip: save each into public/ under its name before building. Free prompts need no account and their footage needs a free one; Unlimited prompts need Unlimited (run nightmarquee_sign_in).",
      inputSchema: z.object({
        // A free slug, deliberately: a model that reaches for the example as a
        // default should land on something it can actually fetch.
        slug: z.string().describe("Prompt slug, e.g. \"glasshouse-nine\" — from nightmarquee_search_prompts"),
        tool: z.enum(TOOL_IDS).optional().describe(DIALECT_HELP),
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
        footage: FOOTAGE_LIST
          .optional()
          .describe("The demo's footage, present when the account may download it"),
        footageExpiresInSeconds: z.number().optional().describe("How long the footage links work"),
        footageMessage: z
          .string()
          .optional()
          .describe("Why a demo with footage came without links, such as needing to sign in"),
        error: z.string().optional().describe("Set when the prompt could not be fetched"),
      }),
    },
    async ({ slug, tool, brand }) => {
      const params = new URLSearchParams();
      const dialect = dialectFor(tool, session().client);
      if (dialect) params.set("tool", dialect);
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
    "nightmarquee_get_footage",
    {
      title: "Get a NightMarquee demo's footage",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        // Every call signs new links and counts toward the hourly limit.
        // Clients only read this when readOnlyHint is false; it is sent
        // anyway because a partial set reads as unspecified.
        idempotentHint: false,
        openWorldHint: true,
      },
      description:
        "Fresh download links for the footage a NightMarquee demo plays, every clip, without fetching the prompt again. Use it when the links from nightmarquee_get_prompt have expired. Save each file into public/ under its name before building. A free prompt's footage needs a free account and the rest need Unlimited (run nightmarquee_sign_in).",
      inputSchema: z.object({
        slug: z.string().describe("Prompt slug, as passed to nightmarquee_get_prompt"),
      }),
      outputSchema: z.object({
        slug: z.string(),
        footage: FOOTAGE_LIST
          .optional()
          .describe("Present when the account may download this demo's footage"),
        footageExpiresInSeconds: z.number().optional().describe("How long the links work"),
        message: z.string().optional().describe("Why there are no links: sign in, upgrade, none, or the hourly limit"),
        pricingUrl: z.string().optional().describe("Set when the footage needs Unlimited"),
        error: z.string().optional().describe("Set when the footage could not be fetched"),
      }),
    },
    async ({ slug }) => {
      const { text, structured } = await fetchFootage(slug, session());
      return reply(text, structured);
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
