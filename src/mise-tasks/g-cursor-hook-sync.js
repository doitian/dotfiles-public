#!/usr/bin/env bun
/**
 * Sync mise cursor:*:on:* tasks to .cursor/hooks.json.
 */
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { $ } from "bun";

const HOOKS_FILE = ".cursor/hooks.json";
const TASK_RE = /^cursor:([^:]+):on:([^\s]+)$/;

async function main() {
	mkdirSync(".cursor", { recursive: true });

	const r = await $`mise tasks`.quiet().nothrow();
	const stdout = (r.stdout?.toString() ?? "").trim();
	const lines = stdout.split("\n");
	const hooks = {};

	for (const line of lines) {
		const task = line.trim().split(/\s/)[0];
		if (!task) continue;
		const m = task.match(TASK_RE);
		if (!m) continue;
		const hookName = m[2];
		const command = `mise run ${task}`;
		if (!hooks[hookName]) hooks[hookName] = [];
		hooks[hookName].push({ command });
	}

	const taskCount = Object.values(hooks).flat().length;
	if (taskCount === 0) {
		if (existsSync(HOOKS_FILE)) {
			unlinkSync(HOOKS_FILE);
			console.log("Deleted " + HOOKS_FILE);
		} else {
			console.log("No cursor:*:on:* tasks found");
		}
		return;
	}

	const payload = { version: 1, hooks };
	writeFileSync(HOOKS_FILE, JSON.stringify(payload, null, 2) + "\n");
	console.log(`Updated ${HOOKS_FILE} with ${taskCount} task(s)`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
