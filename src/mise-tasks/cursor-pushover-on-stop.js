#!/usr/bin/env bun
/**
 * Cursor agent on-stop hook: read JSON from stdin, notify via agent-pushover, output {}.
 */
import { $ } from "bun";
import { readStdin } from "../lib/io.js";

async function main() {
  const raw = await readStdin();
  let status = "unknown";
  try {
    const data = JSON.parse(raw);
    if (data && typeof data.status === "string") status = data.status;
  } catch (_) {}
  const message = `status: ${status}`;
  await $`agent-pushover -t "Cursor Agent Stopped" ${message}`
    .quiet()
    .nothrow();
  process.stdout.write("{}\n");
}

main();
