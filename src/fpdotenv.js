#!/usr/bin/env bun
/**
 * Print dotenv for a gopass entry for `eval $(fpdotenv [entry])` (POSIX) or
 * `fpdotenv [entry] | Invoke-Expression` (PowerShell). The shell is detected
 * automatically; picks the entry via fzf when none is given.
 */
import { $ } from "bun";
import { isPowerShell } from "./lib/env.js";
import { gopass, gopassToEnv } from "./lib/secrets.js";

async function pickEntry() {
  const listR = await $`gopass list -f`.quiet().nothrow();
  if (listR.exitCode !== 0) process.exit(listR.exitCode);
  const list = (listR.stdout?.toString() ?? "").trim();
  const fzfProc = Bun.spawn(["fzf"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
    env: process.env,
  });
  fzfProc.stdin.write(list);
  fzfProc.stdin.end();
  const fzfCode = await fzfProc.exited;
  const fzfOut = fzfProc.stdout
    ? await new Response(fzfProc.stdout).text()
    : "";
  const fzfSelected = fzfOut.trim();
  if (fzfCode !== 0 || !fzfSelected) process.exit(fzfCode ?? 1);
  return fzfSelected.split("\n")[0];
}

async function main() {
  process.env.GPG_TTY =
    process.env.GPG_TTY || (process.platform !== "win32" ? "/dev/tty" : "");
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
