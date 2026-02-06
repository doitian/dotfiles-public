#!/usr/bin/env bun
/**
 * Install cursor-agent cli (Windows): irm | iex
 * #MISE hide=true dir="~" description="Install cursor-agent cli"
 */
import { $ } from "bun";

async function main() {
    await $`powershell -NoProfile -Command ${"irm 'https://cursor.com/install?win32=true' | iex"}`.nothrow();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
