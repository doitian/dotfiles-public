#!/usr/bin/env node
/**
 * Copy GPG key id to clipboard via gopass. Port of default/bin/gpgpass.
 */
import { runCapture, runInherit } from "./lib/run.js";

process.env.GPG_TTY = process.env.GPG_TTY || (process.platform !== "win32" ? "/dev/tty" : "");

async function main() {
  const email = await runCapture("git", ["config", "user.email"]);
  if (email.code !== 0 || !email.stdout.trim()) {
    console.error("git config user.email failed");
    process.exit(1);
  }
  const path = `ids/ian/gpg/${email.stdout.trim()}`;
  const code = await runInherit("gopass", ["show", "-c", path]);
  process.exit(code ?? 0);
}

main();
