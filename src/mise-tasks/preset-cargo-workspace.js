#!/usr/bin/env bun
/**
 * Create a Cargo workspace Cargo.toml if missing.
 */
import { writeFileSync } from "node:fs";
import { exists } from "../lib/fs.js";

async function main() {
    if (await exists("Cargo.toml")) return;
    writeFileSync("Cargo.toml", '[workspace]\nresolver = "3"\n');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
