#!/usr/bin/env bun
/**
 * Cursor agent on-stop hook: read JSON from stdin, notify via agent-pushover, output {}.
 */
import { runInherit } from "../lib/run.js";
import { readStdin } from "../lib/io.js";

async function main() {
    const raw = await readStdin();
    let status = "unknown";
    try {
        const data = JSON.parse(raw);
        if (data && typeof data.status === "string") status = data.status;
    } catch (_) {}
    await runInherit("agent-pushover", [
        "-t",
        "Cursor Agent Stopped",
        `status: ${status}`,
    ]).catch(() => {});
    process.stdout.write("{}\n");
}

main();
