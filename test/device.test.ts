import { chmodSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { credsPath, loadCreds, saveCreds } from "../src/creds.js";
import { signIn } from "../src/device.js";

const session = () => ({ creds: loadCreds(), client: "claude-code/1.0" });

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

/**
 * Typed as fetch so `mock.calls[n][m]` and `([url]) => ...` resolve to real
 * parameters; an untyped `vi.fn(async () => ...)` gets an empty args tuple and
 * does not compile at the destructuring site.
 */
const fetchStub = (impl: (url: string, init: RequestInit) => Promise<Response>) =>
  vi.fn<(url: string, init: RequestInit) => Promise<Response>>(impl);

/** Every distinct device_code the client actually polled with. */
const sentCodes = (mock: ReturnType<typeof fetchStub>) => [
  ...new Set(
    mock.mock.calls
      .filter(([url]) => String(url).includes("/poll"))
      .map(([, init]) => JSON.parse(String(init.body)).device_code as string)
  ),
];

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "nm-device-"));
  process.env.NIGHTMARQUEE_HOME = home;
  delete process.env.NIGHTMARQUEE_TOKEN;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NIGHTMARQUEE_HOME;
  rmSync(home, { recursive: true, force: true });
});

describe("signIn", () => {
  it("returns the code immediately and saves it when approval is slow", async () => {
    const fetchMock = fetchStub(async (url) =>
      url.includes("/start")
        ? json({ device_code: "dc1", user_code: "BRZK-7QTD",
                 verification_uri: "https://nightmarquee.com/mcp/authorize",
                 expires_in: 900, interval: 5 })
        : json({ status: "pending" })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await signIn(session(), { pollMs: 1, budgetMs: 5 });

    expect(result.status).toBe("waiting");
    expect(result.userCode).toBe("BRZK-7QTD");
    expect(result.message).toContain("BRZK-7QTD");
    expect(result.message).toContain("nightmarquee_sign_in");
    expect(loadCreds().pendingDeviceCode).toBe("dc1");
    // The budget really elapsed: start, then at least one poll inside the loop.
    // A trivially-skipped loop would leave this at 1.
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("stores the token and clears the pending code on approval", async () => {
    vi.stubGlobal("fetch", fetchStub(async (url) =>
      url.includes("/start")
        ? json({ device_code: "dc1", user_code: "AAAA-BBBB",
                 verification_uri: "https://x.test/mcp/authorize",
                 expires_in: 900, interval: 5 })
        : json({ status: "approved", token: "nm_live_zzz", email: "a@b.test" })
    ));

    const result = await signIn(session(), { pollMs: 1, budgetMs: 50 });

    expect(result.status).toBe("approved");
    expect(result.email).toBe("a@b.test");
    const creds = loadCreds();
    expect(creds.token).toBe("nm_live_zzz");
    expect(creds.pendingDeviceCode).toBeUndefined();
  });

  it("resumes a pending code instead of starting a new one", async () => {
    saveCreds({ ...loadCreds(), pendingDeviceCode: "dc-old" });
    const fetchMock = fetchStub(async () =>
      json({ status: "approved", token: "nm_live_r", email: null })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await signIn(session(), { pollMs: 1, budgetMs: 50 });

    expect(result.status).toBe("approved");
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes("/start"))).toBe(true);
    // Resuming means polling the *same* code. A new code here would strand the
    // user in front of an approval page nothing is watching.
    expect(sentCodes(fetchMock)).toEqual(["dc-old"]);
  });

  it("starts fresh when the pending code has expired", async () => {
    saveCreds({ ...loadCreds(), pendingDeviceCode: "dc-dead" });
    const fetchMock = fetchStub(async (url, init) => {
      if (String(url).includes("/start")) {
        return json({ device_code: "dc-new", user_code: "CCCC-DDDD",
                      verification_uri: "https://x.test/mcp/authorize",
                      expires_in: 900, interval: 5 });
      }
      // Only the stale code is dead. A code the server just minted polls as
      // pending — answering "expired" to everything would make the fresh flow
      // indistinguishable from the dead one it is supposed to replace.
      const code = JSON.parse(String(init.body)).device_code as string;
      return json({ status: code === "dc-dead" ? "expired" : "pending" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await signIn(session(), { pollMs: 1, budgetMs: 5 });

    expect(result.userCode).toBe("CCCC-DDDD");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/start"))).toBe(true);
    // The dead code is gone and the fresh one is what a later call resumes.
    expect(loadCreds().pendingDeviceCode).toBe("dc-new");
  });

  it("clears the pending code when it expires mid-poll", async () => {
    const fetchMock = fetchStub(async (url) =>
      url.includes("/start")
        ? json({ device_code: "dc1", user_code: "EEEE-FFFF",
                 verification_uri: "https://x.test/mcp/authorize",
                 expires_in: 900, interval: 5 })
        : json({ status: "expired" })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await signIn(session(), { pollMs: 1, budgetMs: 50 });

    expect(result.status).toBe("expired");
    expect(result.message).toContain("nightmarquee_sign_in");
    // Nothing left to resume, so the next call starts a genuinely new flow
    // rather than retrying a dead code forever.
    expect(loadCreds().pendingDeviceCode).toBeUndefined();
  });

  // saveCreds throws by design (Task 12), and it is called on the approval
  // path. A throw escaping here is a stack trace in the user's editor — and a
  // network message here sends someone with a full disk to go debug their wifi
  // at the one moment they are actually trying to pay us.
  it.skipIf(process.getuid?.() === 0)(
    "reports a credentials write failure as itself, not as a network error",
    async () => {
      saveCreds({ ...loadCreds(), pendingDeviceCode: "dc-old" });
      const path = credsPath();
      chmodSync(path, 0o400); // EACCES on the write inside complete()
      vi.stubGlobal("fetch", fetchStub(async () =>
        json({ status: "approved", token: "nm_live_p", email: "a@b.test" })
      ));

      const result = await signIn(session(), { pollMs: 1, budgetMs: 5 });

      // Never a throw: this string reaches the user's editor either way.
      expect(result.message).toBeTypeOf("string");
      expect(["approved", "waiting", "expired", "unavailable"]).toContain(result.status);
      // The sign-in itself worked. Say so, and name the file that did not.
      expect(result.message).toContain("a@b.test");
      expect(result.message).toContain(path);
      expect(result.message).toContain("nightmarquee_sign_in");
      // Their connection was never the problem.
      expect(result.message).not.toContain("connection");
      expect(result.message).not.toContain("nightmarquee.com");
    }
  );

  it("degrades to a readable message when the API is unreachable", async () => {
    vi.stubGlobal("fetch", fetchStub(async () => { throw new Error("offline"); }));
    const result = await signIn(session(), { pollMs: 1, budgetMs: 5 });
    expect(result.status).toBe("unavailable");
    expect(result.message).toContain("nightmarquee.com");
  });
});

/**
 * The poll route throttles whenever two polls land less than 5000ms apart, and
 * 20 consecutive strikes burn the code (POLL_INTERVAL_MS / MAX_SLOW_DOWNS in
 * src/app/api/mcp/device/poll/route.ts). A client that polls on that boundary
 * and treats `slow_down` as an ordinary tick can therefore kill a live sign-in
 * through nothing but clock jitter, and report it to the user as "expired".
 */
describe("signIn poll cadence", () => {
  const pollCount = (mock: ReturnType<typeof fetchStub>) =>
    mock.mock.calls.filter(([url]) => String(url).includes("/poll")).length;

  /** A server advertising `interval` seconds, answering every poll `status`. */
  const stubWithInterval = (interval: number, poll: () => Response) =>
    fetchStub(async (url) =>
      String(url).includes("/start")
        ? json({ device_code: "dc1", user_code: "IIII-JJJJ",
                 verification_uri: "https://x.test/mcp/authorize",
                 expires_in: 900, interval })
        : poll()
    );

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls at the interval /start advertises rather than the default", async () => {
    const fetchMock = stubWithInterval(1, () => json({ status: "pending" }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = signIn(session(), { budgetMs: 20_000 });

    await vi.advanceTimersByTimeAsync(0);
    expect(pollCount(fetchMock)).toBe(0);

    // The advertised interval alone must not be enough. The server compares
    // with `<`, so landing exactly on it is a coin flip against clock jitter.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(pollCount(fetchMock)).toBe(0);

    await vi.advanceTimersByTimeAsync(250);
    expect(pollCount(fetchMock)).toBe(1);

    // The 5s default would still not have fired by here.
    await vi.advanceTimersByTimeAsync(1_250);
    expect(pollCount(fetchMock)).toBe(2);

    await vi.advanceTimersByTimeAsync(30_000);
    await pending;
  });

  it("waits longer before the next poll after slow_down than the advertised cadence", async () => {
    const at: number[] = [];
    const fetchMock = stubWithInterval(1, () => {
      at.push(Date.now());
      // The first poll is throttled; the rest are ordinary waiting.
      return json({ status: at.length === 1 ? "slow_down" : "pending" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const t0 = Date.now();
    const pending = signIn(session(), { budgetMs: 20_000 });
    await vi.advanceTimersByTimeAsync(20_000);
    await pending;

    expect(at.length).toBeGreaterThan(2);
    const advertised = at[0] - t0;
    const afterSlowDown = at[1] - at[0];
    // The server said "too fast". Repeating the same cadence earns another
    // strike, so the gap has to widen rather than stay put.
    expect(afterSlowDown).toBeGreaterThan(advertised);
  });

  it("spends the budget slower under slow_down than under pending", async () => {
    const run = async (status: "pending" | "slow_down") => {
      // Each run must start its own flow; otherwise the second resumes the
      // first's pending code and never sees /start's advertised interval.
      saveCreds({ ...loadCreds(), pendingDeviceCode: undefined });
      const fetchMock = stubWithInterval(5, () => json({ status }));
      vi.stubGlobal("fetch", fetchMock);

      const pending = signIn(session(), { budgetMs: 60_000 });
      await vi.advanceTimersByTimeAsync(120_000);
      await pending;
      return pollCount(fetchMock);
    };

    const pendingPolls = await run("pending");
    const slowDownPolls = await run("slow_down");

    expect(slowDownPolls).toBeLessThan(pendingPolls); // observed: 3 vs 11
    // 20 consecutive strikes burn a live code. Backing off has to keep a whole
    // budget's worth of throttled polls clear of that, with room to spare.
    expect(slowDownPolls).toBeLessThan(20);
  });

  it("keeps the same margin when resuming, where /start never runs", async () => {
    saveCreds({ ...loadCreds(), pendingDeviceCode: "dc-old" });
    const at: number[] = [];
    const fetchMock = fetchStub(async () => {
      at.push(Date.now());
      return json({ status: "pending" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = signIn(session(), { budgetMs: 20_000 });
    await vi.advanceTimersByTimeAsync(20_000);
    await pending;

    // at[0] is the resume probe, at[1] the first poll of the loop. Resuming
    // has no /start to advertise an interval, but the throttle boundary is the
    // same 5000ms either way — landing on it is the same coin flip.
    expect(at[1] - at[0]).toBe(5_250);
  });
});
