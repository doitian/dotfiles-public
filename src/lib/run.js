/**
 * Async child_process helpers: run a command and optionally capture stdout/stderr or feed stdin.
 */
import { spawn } from "node:child_process";

/**
 * Run a command. By default stdio is inherited. Use opts.capture to get { status, stdout, stderr }, or opts.input to pipe stdin.
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ capture?: boolean, input?: string, stdio?: import('child_process').StdioOptions }} [opts]
 * @returns {Promise<{ status: number | null, signal: string | null, stdout?: string, stderr?: string }>}
 */
export function run(cmd, args, opts = {}) {
  const capture = opts.capture ?? opts.input !== undefined;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      encoding: "utf8",
      stdio: capture ? ["pipe", "pipe", "inherit"] : "inherit",
      ...opts,
    });
    let stdout = "";
    let stderr = "";
    if (child.stdout) child.stdout.on("data", (d) => (stdout += d));
    if (child.stderr && capture) child.stderr.on("data", (d) => (stderr += d));
    if (opts.input !== undefined) child.stdin?.end(opts.input);
    child.on("close", (code, sig) =>
      resolve({ status: code, signal: sig, stdout, stderr })
    );
    child.on("error", reject);
  });
}

/**
 * Run with stdio inherited; resolve with exit code. For scripts that just need to wait and exit with same code.
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ stdio?: import('child_process').StdioOptions }} [opts]
 * @returns {Promise<number | null>}
 */
export function runInherit(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, { stdio: "inherit", ...opts });
    c.on("close", (code, sig) =>
      resolve(sig ? 128 + (sig === "SIGINT" ? 2 : 0) : code)
    );
    c.on("error", reject);
  });
}

/**
 * Run and capture stdout (stderr inherited). Returns { code, stdout }.
 */
export function runCapture(cmd, args) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "inherit"],
      encoding: "utf8",
    });
    let out = "";
    c.stdout.on("data", (d) => (out += d));
    c.on("close", (code) => resolve({ code, stdout: out }));
    c.on("error", reject);
  });
}

/**
 * Run with stdin as input and capture stdout. Returns { code, stdout } (stdout trimmed).
 */
export function runWithStdin(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "inherit"],
      encoding: "utf8",
    });
    let out = "";
    c.stdout.on("data", (d) => (out += d));
    c.stdin.end(input);
    c.on("close", (code) => resolve({ code, stdout: out.trim() }));
    c.on("error", reject);
  });
}
