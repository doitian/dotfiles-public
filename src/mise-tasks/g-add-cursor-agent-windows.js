#!/usr/bin/env bun
import { $ } from "bun";

async function main() {
    await $`powershell -NoProfile -Command ${"irm 'https://cursor.com/install?win32=true' | iex"}`.nothrow();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
