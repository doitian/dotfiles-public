#!/usr/bin/env bun
/**
 * Run script with uv: uv run if pyproject.toml/uv.lock exist, else uv run --script.
 * Port of default/bin/uvs.
 */
import { exists } from "./lib/fs.js";
import { spawnSyncOrExit } from "./lib/shell.js";

async function main() {
	const args = process.argv.slice(2).length ? process.argv.slice(2) : ["x.py"];
	const hasProject =
		(await exists("pyproject.toml")) || (await exists("uv.lock"));
	const uvArgs = hasProject ? ["run", ...args] : ["run", "--script", ...args];

	spawnSyncOrExit("uv", ...uvArgs);
}

main();
