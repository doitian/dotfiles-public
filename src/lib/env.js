/**
 * Environment helpers shared by CLI scripts.
 */

/** User home directory (USERPROFILE on Windows, HOME otherwise). */
export function home() {
  return process.env.USERPROFILE || process.env.HOME || "";
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
