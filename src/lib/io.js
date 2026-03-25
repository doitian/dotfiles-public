/**
 * Shared stdin/io helpers for CLI scripts.
 */
import { createInterface } from "node:readline";
import { $ } from "bun";

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
      resolve(Buffer.concat(chunks).toString("utf8")),
    );
    process.stdin.on("error", reject);
    process.stdin.resume?.();
  });
}

/**
 * Read lines from stdin in a loop, calling onLine for each non-empty line.
 * Returns when stdin closes (Ctrl-D) or onLine throws.
 * @param {(line: string) => Promise<void>} onLine - async callback for each line
 * @param {{ prompt?: string }} [options]
 */
export async function readLines(onLine, options = {}) {
  const { prompt = "> " } = options;
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY,
    prompt,
  });

  if (process.stdin.isTTY) {
    rl.prompt();
  }

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) {
      try {
        await onLine(trimmed);
      } catch (err) {
        console.error(err?.message ?? err);
      }
    }
    if (process.stdin.isTTY) {
      rl.prompt();
    }
  }
}

/**
 * Read text from the system clipboard (cross-platform).
 * @returns {Promise<string>}
 */
export async function readClipboard() {
  if (process.platform === "win32") {
    return $`powershell -NoProfile -Command Get-Clipboard`.nothrow().text();
  }
  if (process.env.WAYLAND_DISPLAY && !process.env.WSL_DISTRO_NAME) {
    return $`wl-paste`.nothrow().text();
  }
  if (process.platform === "darwin") {
    return $`pbpaste`.nothrow().text();
  }
  if (Bun.which("xclip")) {
    return $`xclip -out -selection clipboard`.nothrow().text();
  }
  if (Bun.which("powershell.exe")) {
    const raw = await $`powershell.exe -NoLogo -NoProfile -NonInteractive -Command Get-Clipboard`
      .nothrow()
      .text();
    return raw.replace(/\r$/gm, "");
  }
  throw new Error("No clipboard tool found");
}

/**
 * Write text to the system clipboard (cross-platform).
 * Reads from stdin when called with no arguments.
 * @param {ReadableStream | Buffer | string} input
 */
export async function writeClipboard(input) {
  if (process.platform === "win32") {
    await $`clip.exe`.stdin(input).nothrow();
    return;
  }
  if (process.env.WAYLAND_DISPLAY && !process.env.WSL_DISTRO_NAME) {
    await $`wl-copy`.stdin(input).quiet().nothrow();
    return;
  }
  if (process.platform === "darwin") {
    await $`pbcopy`.stdin(input).nothrow();
    return;
  }
  if (Bun.which("xclip")) {
    await $`xclip -in -selection clipboard`.stdin(input).nothrow();
    return;
  }
  if (Bun.which("clip.exe")) {
    await $`clip.exe`.stdin(input).nothrow();
    return;
  }
  throw new Error("No clipboard tool found");
}
