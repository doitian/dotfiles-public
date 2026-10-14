#!/usr/bin/env bun
/**
 * Print dotenv for a gopass entry for `eval $(fpdotenv [entry])` (POSIX) or
 * `fpdotenv [entry] | Invoke-Expression` (PowerShell). The shell is detected
 * automatically; picks the entry via fzf when none is given.
 */
import { $ } from "bun";
import { ensureGpgTty, isPowerShell } from "./lib/env.js";
import { fzf } from "./lib/fzf.js";
import { gopass, gopassToEnv } from "./lib/secrets.js";

async function pickEntry() {
  const listR = await $`gopass list -f`.quiet().nothrow();
  if (listR.exitCode !== 0) process.exit(listR.exitCode);
  const list = (listR.stdout?.toString() ?? "").trim();
  const { code: fzfCode, stdout } = await fzf([], list);
  const fzfSelected = stdout.trim();
  if (fzfCode !== 0 || !fzfSelected) process.exit(fzfCode ?? 1);
  return fzfSelected.split("\n")[0];
}

async function main() {
  ensureGpgTty();
  const entry = process.argv[2] ?? (await pickEntry());
  const env = gopassToEnv(
    await gopass(entry),
    isPowerShell() ? "powershell" : "posix",
  );
  if (env) await Bun.stdout.write(env);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
