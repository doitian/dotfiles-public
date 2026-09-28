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