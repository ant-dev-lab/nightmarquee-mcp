import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activeToken, credsPath, loadCreds, saveCreds } from "../src/creds.js";

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "nm-creds-"));
  process.env.NIGHTMARQUEE_HOME = home;
  delete process.env.NIGHTMARQUEE_TOKEN;
});

afterEach(() => {
  delete process.env.NIGHTMARQUEE_HOME;
  delete process.env.NIGHTMARQUEE_TOKEN;
  rmSync(home, { recursive: true, force: true });
});

describe("loadCreds", () => {
  it("creates a stable install id on first run", () => {
    const first = loadCreds();
    expect(first.installId).toMatch(/^[0-9a-f-]{36}$/);
    expect(loadCreds().installId).toBe(first.installId);
  });

  it("writes the file 0600 so other users cannot read the token", () => {
    saveCreds({ installId: loadCreds().installId, token: "nm_live_x" });
    expect(statSync(credsPath()).mode & 0o777).toBe(0o600);
  });

  it("recovers from a corrupt file instead of crashing", () => {
    writeFileSync(credsPath(), "{ not json");
    expect(loadCreds().installId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("repairs a file that lost its install id", () => {
    writeFileSync(credsPath(), JSON.stringify({ token: "nm_live_keepme" }));
    const creds = loadCreds();
    expect(creds.installId).toMatch(/^[0-9a-f-]{36}$/);
    expect(creds.token).toBe("nm_live_keepme");
  });

  it("round-trips a saved token", () => {
    saveCreds({ ...loadCreds(), token: "nm_live_abc", email: "a@b.test" });
    expect(loadCreds().token).toBe("nm_live_abc");
    expect(JSON.parse(readFileSync(credsPath(), "utf8")).savedAt).toBeTypeOf("string");
  });
});

describe("activeToken", () => {
  it("prefers the environment over the file", () => {
    const creds = { installId: "i", token: "from-file" };
    expect(activeToken(creds)).toBe("from-file");
    process.env.NIGHTMARQUEE_TOKEN = "from-env";
    expect(activeToken(creds)).toBe("from-env");
  });

  it("is undefined when neither is set", () => {
    expect(activeToken({ installId: "i" })).toBeUndefined();
  });
});

describe("loadCreds when the file cannot be persisted", () => {
  // A directory where credentials.json should be: EISDIR on the read, then
  // EISDIR again on the repair write. A read-only home (EROFS/EACCES) and a
  // full disk (ENOSPC) fail the same way. Task 16 calls loadCreds on every
  // tool invocation, so a throw here is a crashed MCP server in the editor.
  beforeEach(() => {
    mkdirSync(credsPath());
  });

  it("returns usable creds instead of throwing", () => {
    const creds = loadCreds();
    expect(creds.installId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("keeps the install id stable for the process lifetime", () => {
    expect(loadCreds().installId).toBe(loadCreds().installId);
  });
});

describe("saveCreds", () => {
  it("re-asserts 0600 on a file that already existed with a wider mode", () => {
    writeFileSync(credsPath(), "{}");
    chmodSync(credsPath(), 0o644);
    saveCreds({ installId: "i", token: "nm_live_x" });
    expect(statSync(credsPath()).mode & 0o777).toBe(0o600);
  });
});
