#!/usr/bin/env bun
/**
 * Show git status for multiple repos (branch, dirty, ahead/behind). No starship; uses git directly.
 * Run with up to 5 repos in parallel. With TTY and without -p, runs fzf for selection.
 * Port of default/bin/git-multistatus.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { $ } from "bun";

const CONCURRENCY = 5;

/**
 * Run fn on each item with at most `limit` concurrent executions.
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<R>} fn
 * @returns {Promise<R[]>}
 * @template T, R
 */
async function mapLimit(items, limit, fn) {
	const results = [];
	const running = new Set();
	for (const item of items) {
		const p = fn(item).then((r) => {
			running.delete(p);
			return r;
		});
		running.add(p);
		results.push(p);
		while (running.size >= limit) await Promise.race(running);
	}
	return Promise.all(results);
}

/**
 * Get branch, dirty, ahead, behind for a repo. Returns null if not a git repo.
 * @param {string} dir
 * @returns {Promise<{ path: string, branch: string, remote?: string, dirty: boolean, ahead: number, behind: number } | null>}
 */
async function getRepoStatus(dir) {
	const path = resolve(dir);
	const gitDir = path + "/.git";
	if (!existsSync(path) || !existsSync(gitDir)) return null;

	const r = await $`git -C ${path} status -b --porcelain`.quiet().nothrow();
	if (r.exitCode !== 0) return null;
	const stdout = (r.stdout?.toString() ?? "").trim();

	const lines = stdout.split(/\r?\n/).filter(Boolean);
	const first = lines[0];
	if (!first || !first.startsWith("## ")) return null;

	// ## branch...upstream [ahead 1, behind 2] or ## branch...upstream [ahead 1] or ## branch
	const rest = first.slice(3);
	const branchMatch = rest.match(/^([^\s.]+)(?:\.\.\.(\S+))?(?:\s+\[(.*)\])?/);
	const branch = branchMatch ? branchMatch[1] : rest.split(/\s/)[0] || "?";
	const remote = branchMatch?.[2];
	const aheadBehind = branchMatch?.[3] || "";
	let ahead = 0;
	let behind = 0;
	const aheadM = aheadBehind.match(/ahead\s+(\d+)/);
	const behindM = aheadBehind.match(/behind\s+(\d+)/);
	if (aheadM) ahead = parseInt(aheadM[1], 10);
	if (behindM) behind = parseInt(behindM[1], 10);

	const dirty = lines.length > 1;

	return { path, branch, remote, dirty, ahead, behind };
}

function formatLine(status) {
	if (!status) return null;
	const { path, branch, dirty, ahead, behind } = status;
	let part = `  ${branch}`;
	let statusStr = "";
	if (dirty) statusStr += " (dirty)";
	if (ahead > 0 || behind > 0) {
		const parts = [];
		if (ahead > 0) parts.push(`ahead ${ahead} ↑`);
		if (behind > 0) parts.push(`behind ${behind} ↓`);
		statusStr += ` (${parts.join(" ")})`;
	}
	if (!statusStr) statusStr = " (≡)";
	part += statusStr;
	return `${path}\t${part}`;
}

async function showStatus(dirs) {
	const statuses = await mapLimit(dirs, CONCURRENCY, getRepoStatus);
	const lines = statuses.map(formatLine).filter(Boolean);
	return lines.join("\n");
}

async function main() {
	const argv = process.argv.slice(2);
	const lazygitIdx = argv.indexOf("--lazygit");
	if (lazygitIdx !== -1) {
		const dir = argv[lazygitIdx + 1];
		if (!dir) {
			console.error("Usage: git-multistatus --lazygit <dir>");
			process.exit(1);
		}
		const cwd = resolve(dir);
		const proc = Bun.spawn(["lazygit"], {
			cwd,
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		});
		const code = await proc.exited;
		process.exit(code ?? 0);
	}

	const hasP = argv.includes("-p");
	const dirs = argv.filter((a) => a !== "-p");
	if (dirs.length === 0) {
		console.error("Usage: git-multistatus [-p] <dir>...");
		process.exit(1);
	}

	const output = await showStatus(dirs);
	const isTty = process.stdout.isTTY;

	if (!hasP && isTty) {
		const reloadCmd =
			"git-multistatus " +
			dirs.map((d) => (d.includes(" ") ? `'${d}'` : d)).join(" ");
		const fzf = Bun.spawn(
			[
				"fzf",
				"--ansi",
				"--multi",
				"-q",
				"'dirty | 'ahead",
				"-d",
				"\t",
				"--header=^l:lazygit",
				"--header-first",
				"--preview=git -c color.ui=always -C {1} status --short --branch -u {1}",
				`--bind=ctrl-l:execute(git-multistatus --lazygit {1})+reload(${reloadCmd})`,
				"--bind=ctrl-r:clear-screen",
				"--bind=enter:abort+become(echo {1})",
			],
			{
				stdin: "pipe",
				stdout: "inherit",
				stderr: "inherit",
			},
		);
		fzf.stdin.write(output);
		fzf.stdin.end();
		const code = await fzf.exited;
		process.exit(code ?? 0);
	}

	console.log(output);
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
