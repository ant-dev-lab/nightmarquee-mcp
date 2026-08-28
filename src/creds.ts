import { randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Creds {
  /** Random, anonymous, stable per machine. Not derived from anything. */
  installId: string;
  token?: string;
  email?: string;
  /** Set while a device-code sign-in is waiting for approval. */
  pendingDeviceCode?: string;
  savedAt?: string;
}

export function credsPath(): string {
  const dir = process.env.NIGHTMARQUEE_HOME ?? join(homedir(), ".nightmarquee");
  return join(dir, "credentials.json");
}

/**
 * Credentials we could not write to disk. A read-only home, a full disk, or a
 * directory sitting where the file should be would otherwise make every call
 * throw. Keyed by path so a changed NIGHTMARQUEE_HOME is not served a stale id.
 */
let memoryFallback: { path: string; creds: Creds } | undefined;

/** Persists if it can, and degrades to memory if it cannot. Never throws. */
function trySave(creds: Creds): Creds {
  const path = credsPath();
  try {
    return saveCreds(creds);
  } catch {
    // Keep working for this process rather than crashing the editor's MCP
    // connection. The id stays stable so telemetry is coherent per session;
    // it just will not survive a restart.
    if (memoryFallback?.path !== path) memoryFallback = { path, creds };
    return memoryFallback.creds;
  }
}

/**
 * Reads credentials, creating and persisting an install id on first run.
 * Never throws: Task 16 calls this on every tool invocation, so a throw here
 * is a dead MCP server and a stack trace inside someone's editor.
 */
export function loadCreds(): Creds {
  const path = credsPath();
  // Already known unwritable this process: do not re-read a broken file.
  if (memoryFallback?.path === path) return memoryFallback.creds;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<Creds>;
    if (typeof parsed.installId === "string" && parsed.installId.length > 0) {
      return parsed as Creds;
    }
    return trySave({ ...parsed, installId: randomUUID() });
  } catch {
    // Missing, unreadable or corrupt: start clean rather than crash the server.
    return trySave({ installId: randomUUID() });
  }
}

/** Throws if the write fails, so callers that must know about it can react. */
export function saveCreds(creds: Creds): Creds {
  const path = credsPath();
  const next = { ...creds, savedAt: new Date().toISOString() };
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  // `mode` above only applies when the file is created. Re-assert it: the file
  // may predate us from a backup unpack, an scp, or another writer.
  chmodSync(path, 0o600);
  return next;
}

/** The environment wins: that is the headless and CI path. */
export function activeToken(creds: Creds): string | undefined {
  return process.env.NIGHTMARQUEE_TOKEN || creds.token || undefined;
}
