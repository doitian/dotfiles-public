#!/usr/bin/env bun
/**
 * Generate a git commit message from staged changes using OpenAI.
 * Uses embedded prompt and Bun.spawn for git commands.
 */
import { getOpenAICredentials } from "./lib/secrets.js";
import { OpenAI } from "./lib/openai.js";

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

Respond with ONLY the commit message (subject, blank line, body, and optional further paragraphs). No extra commentary.`;

async function main() {
  const { apiKey, baseURL, model } = await getOpenAICredentials();
  const client = new OpenAI({ apiKey, baseURL });

  run(client, model).catch((err) => {
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
    const [diffResult, logResult] = results;
    if (diffResult.exitCode !== 0) {
      if (diffResult.err.trim()) console.error(diffResult.err.trim());
      process.exit(1);
    }
    diff = diffResult.out;
    log =
      logResult.exitCode === 0 && logResult.out?.trim()
        ? logResult.out.trim()
        : "(no commits yet)";
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

  let completion;
  try {
    completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
    });
  } catch (err) {
    console.error("API error:", err?.message ?? err);
    process.exit(1);
  }

  const raw = completion.choices?.[0]?.message?.content;
  if (!raw?.trim()) {
    console.error("No output from model.");
    process.exit(1);
  }

  console.log(raw);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
