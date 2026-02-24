#!/usr/bin/env bun
/**
 * Generate a git commit message from staged changes using OpenAI.
 * Uses embedded prompt, Bun.spawn for git commands, and structured output.
 * Uses Chat Completions API
 */
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getSecret } from "./lib/secrets.js";
import { getOpenAIClient } from "./lib/openai.js";

const SYSTEM_PROMPT = `Use the output of \`git diff --staged\` to generate the commit message.

- Summarize the nature of the changes as subject (eg. new feature, enhancement to an existing feature, bug fix, refactoring, test, docs, etc.).
    - Ensure the subject accurately reflects the changes and their purpose (i.e. "add" means a wholly new feature, "update" means an enhancement to an existing feature, "fix" means a bug fix, etc.).
    - Subject is lowercase, no period at the end.
    - Follow this repository's commit message style by checking the output \`git log --oneline -n 5 --no-merges\`.
    - Keep the subject within 72 characters
- Draft a concise (1-2 sentences) body that focuses on the "why" rather than the "what".
    - Body must use proper punctuation and capitalization like normal paragraphs.
- Add further paragraphs if necessary. Bullet points are OK.
- Wrap body and further paragraphs at 72 characters.

Respond with a JSON object with keys: subject, body, furtherParagraphs (string or null).`;

const GitCommitSchema = z.object({
	subject: z.string(),
	body: z.string(),
	furtherParagraphs: z.string().nullable(),
});

async function main() {
	const apiKey = await getSecret("openai-api-key", "OPENAI_API_KEY");
	const baseURL =
		(await getSecret("openai-base-url", "OPENAI_BASE_URL")) ??
		"https://api.openai.com";
	const model =
		(await getSecret("openai-model", "OPENAI_MODEL")) ?? "gpt-4o-mini";
	const { client, model: resolvedModel } = getOpenAIClient({
		apiKey,
		baseURL,
		model,
	});
	run(client, resolvedModel).catch((err) => {
		console.error(err?.message ?? err);
		process.exit(1);
	});
}

async function run(client, model) {
	let diff;
	let log;
	try {
		const diffProc = Bun.spawn(["git", "diff", "--staged"], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const logProc = Bun.spawn(
			["git", "log", "--oneline", "-n", "5", "--no-merges"],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const procs = [diffProc, logProc];
		const results = await Promise.all(
			procs.map(async (proc) => {
				await proc.exited;
				const [out, err] = await Promise.all([
					proc.stdout ? new Response(proc.stdout).text() : "",
					proc.stderr ? new Response(proc.stderr).text() : "",
				]);
				return { exitCode: proc.exitCode, out, err };
			}),
		);
		for (const r of results) {
			if (r.exitCode !== 0) {
				if (r.err.trim()) console.error(r.err.trim());
				process.exit(1);
			}
		}
		diff = results[0].out;
		log = results[1].out;
	} catch (e) {
		console.error("Failed to run git commands:", e?.message ?? e);
		process.exit(1);
	}

	if (!diff || !diff.trim()) {
		console.error("Nothing staged. Stage changes with git add.");
		process.exit(1);
	}

	const messages = [
		{ role: "system", content: SYSTEM_PROMPT },
		{
			role: "user",
			content: `Staged diff:\n\n${diff}\n\nRecent commits:\n\n${log}`,
		},
	];

	const completionParams = {
		model,
		messages,
		temperature: 0.2,
		response_format: zodResponseFormat(GitCommitSchema, "git_commit_message"),
	};

	let completion;
	try {
		completion = await client.beta.chat.completions.parse(completionParams);
	} catch (err) {
		console.error("API error:", err?.message ?? err);
		process.exit(1);
	}

	const choice = completion.choices?.[0];
	const parsed = choice?.message?.parsed ?? null;
	if (parsed == null) {
		const refusal = choice?.message?.refusal;
		if (refusal) {
			console.error("Model refused:", refusal);
		} else {
			console.error("No parsed output from model.");
		}
		process.exit(1);
	}

	const parts = [parsed.subject, parsed.body];
	if (parsed.furtherParagraphs?.trim()) {
		parts.push(parsed.furtherParagraphs.trim());
	}
	const message = parts.join("\n\n");
	console.log(message);
}

main().catch((err) => {
	console.error(err?.message ?? err);
	process.exit(1);
});
