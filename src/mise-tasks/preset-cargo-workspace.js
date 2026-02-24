#!/usr/bin/env bun
import { writeIfNotExists } from "../lib/fs";

async function main() {
	await writeIfNotExists("Cargo.toml", '[workspace]\nresolver = "3"\n');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
