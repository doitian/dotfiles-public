#!/usr/bin/env bun
/**
 * Generate a git commit message from staged changes using OpenAI.
 */
import { $ } from "bun";
import { parseArgs as parseArgsUtil } from "node:util";
import {
  reasoningEffortBody,
  resolveThinking,
  thinkingHelp,
} from "./lib/ai-thinking.js";
import { OpenAI } from "./lib/openai.js";
import { getOpenAICredentials } from "./lib/secrets.js";

const USAGE = `Usage: git-mgen [options]

Generate a git commit message from staged changes.

Options:
${thinkingHelp("none")}
  -h, --help           Show this help
`;

function parseArgs() {
  const { values } = parseArgsUtil({
    options: {
      help: { type: "boolean", short: "h" },
      thinking: { type: "string" },
    },
  });
  if (values.help) {
    console.log(USAGE.trim());
    process.exit(0);
  }
  return { thinking: resolveThinking(values.thinking, "none") };
}

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
  const { thinking } = parseArgs();
  const { apiKey, baseURL, model } = await getOpenAICredentials();
  const client = new OpenAI({ apiKey, baseURL });

  run(client, model, thinking).catch((err) => {
    console.error(err?.message ?? err);
    process.exit(1);
  });
}

async function run(client, model, thinking) {
  let diff;
  let log;
  try {
    const [diffResult, logResult] = await Promise.all([
      $`git diff --staged`.quiet().nothrow(),
      $`git log --oneline -n 5 --no-merges`.quiet().nothrow(),
    ]);
    if (diffResult.exitCode !== 0) {
      const err = diffResult.stderr.toString().trim();
      if (err) console.error(err);
      process.exit(1);
    }
    diff = diffResult.stdout.toString();
    const recentCommits = logResult.stdout.toString().trim();
    log =
      logResult.exitCode === 0 && recentCommits
        ? recentCommits
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
      ...reasoningEffortBody(thinking),
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
