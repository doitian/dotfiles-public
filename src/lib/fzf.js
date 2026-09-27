/**
 * fzf helpers shared by CLI scripts.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { home } from "./env.js";

/**
 * Path to a named fzf query history file. The parent directory is created so
 * fzf can persist previous search words across runs.
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function queryHistoryFile(name) {
  const stateDir =
    process.platform === "win32"
      ? process.env.LOCALAPPDATA || join(home(), "AppData", "Local")
      : process.env.XDG_STATE_HOME || join(home(), ".local", "state");
  const path = join(stateDir, "fzf", `${name}-history`);
  await mkdir(dirname(path), { recursive: true });
  return path;
}