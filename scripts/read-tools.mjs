import { spawn } from "node:child_process";

/**
 * Starts a built server, initializes it and asks each method in turn,
 * resolving to { initialize, [method]: result }. Keeps stdin open until the
 * last reply, because the SDK from 2.3 on stops at end of input without
 * answering requests it has not finished.
 */
export function probeServer(entry, methods, { env = {}, cwd, timeoutMs = 60_000 } = {}) {
  const req = (id, method, params = {}) =>
    `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`;

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const results = {};
    let buffered = "";
    let stderr = "";
    const timer = setTimeout(
      () => finish(new Error(`no reply to ${methods.join(", ")} in ${timeoutMs}ms\n${stderr}`)),
      timeoutMs
    );

    function finish(err) {
      clearTimeout(timer);
      child.kill();
      if (err) reject(err);
      else resolve(results);
    }

    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (err) => finish(err));
    child.stdout.on("data", (chunk) => {
      buffered += chunk;
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      for (const line of lines) {
        let frame;
        try {
          frame = JSON.parse(line);
        } catch {
          continue;
        }
        if (frame.id === 0) {
          results.initialize = frame.result;
          child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
          methods.forEach((method, i) => child.stdin.write(req(i + 1, method)));
        } else if (typeof frame.id === "number" && frame.id > 0) {
          results[methods[frame.id - 1]] = frame.result ?? { error: frame.error };
          if (methods.every((m) => m in results)) finish(null);
        }
      }
    });

    child.stdin.write(
      req(0, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "nightmarquee-build", version: "0" },
      })
    );
  });
}

/** The tools a built server declares, as { name, description }: all an MCPB manifest accepts. */
export async function readTools(entry, env = {}) {
  const { "tools/list": list } = await probeServer(entry, ["tools/list"], { env });
  if (!list?.tools?.length) throw new Error(`tools/list answered without tools: ${JSON.stringify(list)}`);
  return list.tools.map(({ name, description }) => ({ name, description }));
}
