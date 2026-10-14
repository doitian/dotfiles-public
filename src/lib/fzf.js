/**
 * fzf helpers shared by CLI scripts.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { stateDir } from "./env.js";

/**
 * Path to a named fzf query history file. The parent directory is created so
 * fzf can persist previous search words across runs.
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function queryHistoryFile(name) {
  const path = join(stateDir(), "fzf", `${name}-history`);
  await mkdir(dirname(path), { recursive: true });
  return path;
}

/**
 * Run fzf over `input` and return its exit code and raw stdout.
 * @param {string[]} args
 * @param {string | Blob | ReadableStream} input Text, or any stdin source Bun.spawn accepts.
 * @returns {Promise<{ code: number, stdout: string }>}
 */
export async function fzf(args, input) {
  const proc = Bun.spawn(["fzf", ...args], {
    stdin: typeof input === "string" ? new Blob([input]) : input,
    stdout: "pipe",
    stderr: "inherit",
    env: process.env,
  });
  const [code, stdout] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
  ]);
  return { code, stdout };
}
