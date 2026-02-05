#!/usr/bin/env bun
/**
 * Install cursor-agent cli (Windows): irm | iex
 * #MISE hide=true dir="~" description="Install cursor-agent cli"
 */
import { runInherit } from "../lib/run.js";

async function main() {
    await runInherit("powershell", [
        "-NoProfile",
        "-Command",
        "irm 'https://cursor.com/install?win32=true' | iex",
    ]);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
