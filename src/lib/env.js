/**
 * Environment helpers shared by CLI scripts.
 */
import { join } from "node:path";

/** User home directory (USERPROFILE on Windows, HOME otherwise). */
export function home() {
  return process.env.USERPROFILE || process.env.HOME || "";
}

/**
 * Base directory for per-user state: %LOCALAPPDATA% on Windows and
 * $XDG_STATE_HOME (or ~/.local/state) elsewhere.
 * @returns {string}
 */
export function stateDir() {
  return process.platform === "win32"
    ? process.env.LOCALAPPDATA || join(home(), "AppData", "Local")
    : process.env.XDG_STATE_HOME || join(home(), ".local", "state");
}

/**
 * Detect whether the invoking shell is PowerShell. COMSPEC is always cmd.exe on
 * Windows even under PowerShell, so use PSModulePath: PowerShell populates it
 * with 3+ entries, while a bare cmd/system environment has at most 2.
 */
export function isPowerShell() {
  const psModulePath = process.env.PSModulePath ?? "";
  const sep = process.platform === "win32" ? ";" : ":";
  return psModulePath.split(sep).filter(Boolean).length >= 3;
}
