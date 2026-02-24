#!/usr/bin/env bun
/**
 * Run a command and send a Pushover notification with result and duration.
 * Port of default/bin/pushover-exec.
 */
import { getSecret } from "./lib/secrets.js";
import { send } from "./lib/pushover.js";

const HOST = process.env.HOST || process.env.HOSTNAME || "";

async function getCredentials() {
  const userKey = await getSecret("pushover-user-key", "PUSHOVER_USER_KEY");
  const appToken = await getSecret(
    "pushover-personal-token",
    "PUSHOVER_PERSONAL_TOKEN",
    "PUSHOVER_APP_TOKEN",
  );
  return { userKey, appToken };
}

async function runCommand(argv) {
  const proc = Bun.spawn(argv, {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  const sig = proc.signalCode;
  return sig ? 128 + (sig === "SIGINT" ? 2 : 0) : code;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds / 60) % 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error("Usage: pushover-exec <command> [args...]");
    process.exit(1);
  }

  const stime = Date.now();
  const exitCode = await runCommand(argv);
  const etime = Date.now();
  const dtSec = Math.floor((etime - stime) / 1000);
  const times = formatDuration(dtSec);
  const hostSuffix = HOST ? ` on ${HOST}` : "";

  const creds = await getCredentials();
  const title = `exec ${argv.join(" ")}`;
  if (exitCode === 0) {
    await send({ title, message: `Succeeded${hostSuffix} in ${times}` }, creds);
  } else {
    await send(
      { title, message: `Failed${hostSuffix} in ${times}`, priority: "1" },
      creds,
    );
  }
  process.exit(exitCode ?? 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
