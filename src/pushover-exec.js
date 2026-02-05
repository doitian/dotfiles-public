#!/usr/bin/env node
/**
 * Run a command and send a Pushover notification with result and duration.
 * Port of default/bin/pushover-exec.
 */
import { spawn } from "node:child_process";
import {
  DEFAULT_PUSHOVER_USER_KEY,
  DEFAULT_PUSHOVER_PERSONAL_TOKEN,
} from "./lib/config.js";
import { send } from "./lib/pushover.js";

const HOST = process.env.HOST || process.env.HOSTNAME || "";

function getCredentials() {
  const userKey = process.env.PUSHOVER_USER_KEY ?? DEFAULT_PUSHOVER_USER_KEY;
  const appToken =
    process.env.PUSHOVER_PERSONAL_TOKEN ?? DEFAULT_PUSHOVER_PERSONAL_TOKEN;
  if (!userKey || !appToken)
    throw new Error(
      "Missing Pushover credentials: set PUSHOVER_USER_KEY and PUSHOVER_PERSONAL_TOKEN (or build with defaults)"
    );
  return { userKey, appToken };
}

function runCommand(argv) {
  return new Promise((resolve, reject) => {
    const cmd = argv[0];
    const cargs = argv.slice(1);
    const c = spawn(cmd, cargs, { stdio: "inherit" });
    c.on("close", (code, sig) => resolve(sig ? 128 + (sig === "SIGINT" ? 2 : 0) : code));
    c.on("error", reject);
  });
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

  const creds = getCredentials();
  const title = `exec ${argv.join(" ")}`;
  if (exitCode === 0) {
    await send({ title, message: `Succeeded${hostSuffix} in ${times}` }, creds);
  } else {
    await send(
      { title, message: `Failed${hostSuffix} in ${times}`, priority: "1" },
      creds
    );
  }
  process.exit(exitCode ?? 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
