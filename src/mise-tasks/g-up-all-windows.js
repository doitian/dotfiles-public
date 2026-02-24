#!/usr/bin/env bun
import { $ } from "bun";
import { spawnSyncOrExit } from "../lib/shell";

async function hasCommand(cmd, args = []) {
	const r = await $`${cmd} ${args}`.quiet().nothrow();
	return r.exitCode === 0;
}

async function main() {
	if (await hasCommand("scoop", ["--version"])) {
		spawnSyncOrExit("scoop", "update", "-a");
	}
	if (await hasCommand("uv", ["--version"])) {
		spawnSyncOrExit("mise", "run", "g:up:uv");
	}
	if (await hasCommand("bun", ["--version"])) {
		spawnSyncOrExit("mise", "run", "g:up:bun");
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
