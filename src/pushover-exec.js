#!/usr/bin/env node
/**
 * Run a command and send a Pushover notification with result and duration.
 * Depends on pushover-send (uses lib/pushover.js). Port of default/bin/pushover-exec.
 */
import { spawn } from "node:child_process";
import { send } from "./lib/pushover.js";

const HOST = process.env.HOST || process.env.HOSTNAME || "";

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

  const title = `exec ${argv.join(" ")}`;
  if (exitCode === 0) {
    await send({ title, message: `Succeeded${hostSuffix} in ${times}` });
  } else {
    await send({ title, message: `Failed${hostSuffix} in ${times}`, priority: "1" });
  }
  process.exit(exitCode ?? 0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
