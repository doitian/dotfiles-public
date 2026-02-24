/**
 * Shared stdin/io helpers for CLI scripts.
 */
import { createInterface } from "node:readline";

/**
 * Read all input from stdin. With TTY: readline (Ctrl-D/Ctrl-Z to end). With pipe: stream until end.
 * @returns {Promise<string>}
 */
export function readStdin() {
	if (process.stdin.isTTY) {
		return new Promise((resolve, reject) => {
			const lines = [];
			const rl = createInterface({
				input: process.stdin,
				output: process.stdout,
				terminal: true,
			});
			rl.on("line", (line) => lines.push(line));
			rl.on("close", () => resolve(lines.join("\n")));
			rl.on("error", reject);
		});
	}
	return new Promise((resolve, reject) => {
		const chunks = [];
		process.stdin.on("data", (chunk) => chunks.push(chunk));
		process.stdin.on("end", () =>
			resolve(Buffer.concat(chunks).toString("utf8")),
		);
		process.stdin.on("error", reject);
		process.stdin.resume?.();
	});
}

/**
 * Read lines from stdin in a loop, calling onLine for each non-empty line.
 * Returns when stdin closes (Ctrl-D) or onLine throws.
 * @param {(line: string) => Promise<void>} onLine - async callback for each line
 * @param {{ prompt?: string }} [options]
 */
export async function readLines(onLine, options = {}) {
	const { prompt = "> " } = options;
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: process.stdin.isTTY,
		prompt,
	});

	if (process.stdin.isTTY) {
		rl.prompt();
	}

	for await (const line of rl) {
		const trimmed = line.trim();
		if (trimmed) {
			try {
				await onLine(trimmed);
			} catch (err) {
				console.error(err?.message ?? err);
			}
		}
		if (process.stdin.isTTY) {
			rl.prompt();
		}
	}
}
