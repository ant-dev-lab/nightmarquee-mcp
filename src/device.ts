import { hostname } from "node:os";
import { apiPost, type Session } from "./api.js";
import { credsPath, loadCreds, saveCreds } from "./creds.js";

interface StartResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface PollResponse {
  status: "pending" | "approved" | "expired" | "slow_down";
  token?: string;
  email?: string | null;
}

export interface SignInResult {
  status: "approved" | "waiting" | "expired" | "unavailable";
  email?: string | null;
  userCode?: string;
  verificationUri?: string;
  /** Ready to hand straight back to the model. */
  message: string;
}

/** Long enough to cover the common case, short enough to beat client timeouts. */
const DEFAULT_BUDGET_MS = 60_000;
/** Only used until /start tells us the interval it actually wants. */
const DEFAULT_POLL_MS = 5_000;
/**
 * Margin on top of the advertised interval. The route throttles on
 * `elapsed < interval`, so polling at exactly the interval is a coin flip
 * against clock jitter — and twenty lost flips burn the user's live code.
 */
const POLL_BUFFER_MS = 250;
/** Ceiling on slow_down backoff. Past this, waiting longer helps nobody. */
const MAX_POLL_MS = 30_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The server advertises a poll interval precisely so we need not guess. The
 * buffer goes on either way: resuming never sees a /start, but the route's
 * throttle boundary is the same 5000ms whether or not it told us about it.
 */
function advertisedPollMs(interval: unknown): number {
  const base =
    typeof interval === "number" && Number.isFinite(interval) && interval > 0
      ? interval * 1000
      : DEFAULT_POLL_MS;
  return base + POLL_BUFFER_MS;
}

/**
 * Device-code sign-in. Polls inline for a budget, then persists the pending
 * code so a second call resumes the same code rather than stranding the user.
 */
export async function signIn(
  session: Session,
  opts: { pollMs?: number; budgetMs?: number } = {}
): Promise<SignInResult> {
  const budgetMs = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  // The caller's value wins; otherwise whatever /start advertises, once it has
  // told us; otherwise the default, buffer included.
  let pollMs = opts.pollMs ?? advertisedPollMs(undefined);

  let creds = loadCreds();
  let deviceCode = creds.pendingDeviceCode;
  let started: StartResponse | null = null;

  try {
    if (deviceCode) {
      // Resume: one probe tells us whether the old code is still alive.
      const probe = await apiPost<PollResponse>(
        "/api/mcp/device/poll",
        { device_code: deviceCode },
        session
      );
      if (probe.status === "approved") return complete(probe);
      if (probe.status === "expired") deviceCode = undefined;
    }

    if (!deviceCode) {
      started = await apiPost<StartResponse>(
        "/api/mcp/device/start",
        { client: session.client, hostname: safeHostname() },
        session
      );
      deviceCode = started.device_code;
      if (opts.pollMs === undefined) pollMs = advertisedPollMs(started.interval);
      creds = saveCreds({ ...creds, pendingDeviceCode: deviceCode });
    }

    let delay = pollMs;
    const deadline = Date.now() + budgetMs;
    // Stop *before* a sleep that would run past the budget rather than after
    // it: overshooting the budget is exactly what the client timeout sees.
    while (Date.now() + delay <= deadline) {
      await sleep(delay);
      const poll = await apiPost<PollResponse>(
        "/api/mcp/device/poll",
        { device_code: deviceCode },
        session
      );
      if (poll.status === "approved") return complete(poll);
      if (poll.status === "slow_down") {
        // The server is telling us we are polling too fast. Carrying on at the
        // same cadence collects twenty strikes and burns a code the user is
        // still standing in front of. Widen the gap and leave it widened —
        // snapping back to the old cadence just trips the throttle again.
        delay = Math.min(delay * 2, MAX_POLL_MS);
        continue;
      }
      if (poll.status === "expired") {
        saveCreds({ ...loadCreds(), pendingDeviceCode: undefined });
        return {
          status: "expired",
          message: "That sign-in request expired. Run nightmarquee_sign_in again for a fresh code.",
        };
      }
    }
  } catch {
    return {
      status: "unavailable",
      message:
        "Couldn't reach nightmarquee.com to sign in. Check your connection and run nightmarquee_sign_in again.",
    };
  }

  const uri = started?.verification_uri ?? "https://nightmarquee.com/mcp/authorize";
  const code = started?.user_code;

  return {
    status: "waiting",
    userCode: code,
    verificationUri: uri,
    message: code
      ? [
          `Open ${uri}?code=${code} and approve the connection.`,
          `Your code is ${code}.`,
          "",
          "Once you've approved it, run nightmarquee_sign_in again to finish — it picks up the same request.",
        ].join("\n")
      : "Still waiting for approval. Run nightmarquee_sign_in again once you've approved it in the browser.",
  };
}

function complete(poll: PollResponse): SignInResult {
  const email = poll.email ?? null;
  const who = email ? `Signed in as ${email}` : "Signed in";

  try {
    saveCreds({
      ...loadCreds(),
      token: poll.token,
      email: poll.email ?? undefined,
      pendingDeviceCode: undefined,
    });
  } catch {
    // The sign-in worked; the disk did not. saveCreds throws by design, and
    // letting it fall through to signIn's catch would blame the network — so
    // someone with a full disk or a read-only home goes off to debug their
    // wifi, at the one moment they are actually trying to buy something.
    return {
      status: "unavailable",
      email,
      message: [
        `${who}, but couldn't save your credentials to ${credsPath()}.`,
        "Check that the file is writable and there's free disk space, then run nightmarquee_sign_in again.",
      ].join("\n"),
    };
  }

  return {
    status: "approved",
    email,
    message: `${who}. Every prompt your account can reach is now available here.`,
  };
}

function safeHostname(): string | undefined {
  try {
    return hostname();
  } catch {
    return undefined;
  }
}
