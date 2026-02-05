/**
 * Shared stdin/io helpers for CLI scripts.
 */
import { createInterface } from "node:readline";

/**
 * Read all input from stdin. With TTY: readline (Ctrl-D/Ctrl-Z to end). With pipe: stream until end.
 * @returns {Promise<string>}
 */
export function readStdin() {
  if (process.stdin.isTTY) {
    return new Promise((resolve, reject) => {
      const lines = [];
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
      });
      rl.on("line", (line) => lines.push(line));
      rl.on("close", () => resolve(lines.join("\n")));
      rl.on("error", reject);
    });
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8"))
    );
    process.stdin.on("error", reject);
    process.stdin.resume?.();
  });
}
