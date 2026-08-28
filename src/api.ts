import { activeToken, type Creds } from "./creds.js";
import { PACKAGE_VERSION } from "./version.js";

export interface Session {
  creds: Creds;
  /** Reported by the MCP client at handshake, e.g. "claude-code/1.2.3". */
  client: string;
}

export interface CatalogPrompt {
  slug: string;
  title: string;
  category: string;
  tier: "free" | "unlimited";
  brand: string;
  tagline: string;
  description: string;
  chips: string[];
  drop: number;
  publishedAt: string;
  demoUrl: string;
  pageUrl: string;
}

export interface Catalog {
  version: number;
  tools: string[];
  categories: { slug: string; label: string; tag: string; description: string }[];
  prompts: CatalogPrompt[];
}

export interface PromptBody {
  entitled: boolean;
  tier: string;
  tool?: string;
  title?: string;
  text?: string;
  demoUrl?: string;
  signedIn?: boolean;
  teaser?: string;
  upsell?: { pricingUrl: string; message: string };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiBase(): string {
  return process.env.NIGHTMARQUEE_API ?? "https://nightmarquee.com";
}

/**
 * Ceiling on any single request. A refused connection fails at once, but a
 * server that accepts and then never answers would otherwise hang on Node's
 * ~300s default — and the catalog fetch runs inside the `serveStdio` factory,
 * so that hang surfaces to the user as an uninformative "server failed to
 * start". Ten seconds is far longer than any real response and far shorter
 * than a client's patience.
 */
export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * `AbortSignal.timeout` throws a synchronous RangeError past 2^32−1, which
 * would make every request fail instantly behind the "couldn't reach
 * nightmarquee.com" message — the exact opposite of asking for a longer wait.
 * ~24.8 days is already far beyond any plausible link.
 */
export const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Escape hatch for genuinely slow links, in the same style as
 * NIGHTMARQUEE_API. Unparseable and non-positive values fall back rather than
 * disabling the bound; absurdly large ones clamp rather than break it.
 */
export function requestTimeoutMs(): number {
  const raw = Number(process.env.NIGHTMARQUEE_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(raw, MAX_TIMEOUT_MS);
}

function headersFor(session: Session): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-nm-version": PACKAGE_VERSION,
  };

  if (!process.env.NIGHTMARQUEE_NO_TELEMETRY) {
    headers["x-nm-install"] = session.creds.installId;
    headers["x-nm-client"] = session.client;
  }

  const token = activeToken(session.creds);
  if (token) headers.authorization = `Bearer ${token}`;

  return headers;
}

export async function apiGet<T>(path: string, session: Session): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: headersFor(session),
    // Rejects with a TimeoutError, which every caller's catch already treats
    // as unreachable — the same message a refused connection gets.
    signal: AbortSignal.timeout(requestTimeoutMs()),
  });
  if (!res.ok) throw new ApiError(res.status, `GET ${path} failed (${res.status})`);
  return (await res.json()) as T;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  session: Session
): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { ...headersFor(session), "content-type": "application/json" },
    body: JSON.stringify(body),
    // Same bound as apiGet. A hung /poll during sign-in is the same failure,
    // just later in the session — and signIn's own budget cannot notice a
    // request that never returns.
    signal: AbortSignal.timeout(requestTimeoutMs()),
  });
  if (!res.ok) throw new ApiError(res.status, `POST ${path} failed (${res.status})`);
  return (await res.json()) as T;
}
