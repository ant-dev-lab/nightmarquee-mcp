import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** Source with comments removed, so only text a person can see is checked. */
function visibleText(file: string): string {
  return readFileSync(join(src, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

// The house style has no long dashes in anything a person reads, and every
// string here reaches someone: in a tool result, a slash command title or
// stderr.
describe("package copy", () => {
  it.each(readdirSync(src).filter((f) => f.endsWith(".ts")))("%s has no long dashes", (file) => {
    const lines = visibleText(file)
      .split("\n")
      .filter((line) => /[\u2013\u2014]/.test(line));
    expect(lines).toEqual([]);
  });
});
