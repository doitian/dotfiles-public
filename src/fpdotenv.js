#!/usr/bin/env bun
/**
 * Pick a gopass entry via fzf and print dotenv for `eval $(fpdotenv)`.
 */
import { $ } from "bun";
import { gopass, gopassToEnv } from "./lib/secrets.js";

async function main() {
  process.env.GPG_TTY =
    process.env.GPG_TTY || (process.platform !== "win32" ? "/dev/tty" : "");
  const listR = await $`gopass list -f`.quiet().nothrow();
  if (listR.exitCode !== 0) process.exit(listR.exitCode);
  const list = { stdout: (listR.stdout?.toString() ?? "").trim() };
  const fzfProc = Bun.spawn(["fzf"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
    env: process.env,
  });
  fzfProc.stdin.write(list.stdout);
  fzfProc.stdin.end();
  const fzfCode = await fzfProc.exited;
  const fzfOut = fzfProc.stdout
    ? await new Response(fzfProc.stdout).text()
    : "";
  const fzfSelected = fzfOut.trim();
  if (fzfCode !== 0 || !fzfSelected) process.exit(fzfCode ?? 1);
  const entry = fzfSelected.split("\n")[0];
  const env = gopassToEnv(await gopass(entry));
  if (env) await Bun.stdout.write(env);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
