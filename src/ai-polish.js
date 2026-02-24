#!/usr/bin/env bun
/**
 * Polish text from stdin using the prompt in ai/skills/polish/SKILL.md.
 * Sends completion request (OpenAI) and writes the polished text to stdout.
 *
 * With -f/--file or positional args: read stdin once, polish, exit.
 * Otherwise: interactive line mode (polish each line).
 *
 * Positional args are prepended to the user prompt (e.g. instructions).
 */
import { join } from "node:path";
import { parseArgs as parseArgsUtil } from "node:util";
import { home } from "./lib/env.js";
import { readLines } from "./lib/io.js";
import { getOpenAIClient, runOneshot } from "./lib/openai.js";
import { getSecret } from "./lib/secrets.js";

const USAGE = `Usage: ai-polish [options] [instruction...]

Polish text from stdin. Positional arguments are prepended to the text as instructions.

Options:
  -f, --file <path>   Prepend contents of file to the input
  -h, --help          Show this help
`;

function parseArgs() {
  const { values, positionals } = parseArgsUtil({
    allowPositionals: true,
    options: {
      file: { type: "string", short: "f" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(USAGE.trim());
    process.exit(0);
  }
  const prefix = positionals.length ? positionals.join(" ") : "";
  return { file: values.file ?? null, prefix };
}

async function loadFileContent(filePath) {
  if (!filePath) return null;
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  return await file.text();
}

const SKILL_PATH = join(
  home(),
  ".dotfiles",
  "repos",
  "public",
  "ai",
  "skills",
  "polish",
  "SKILL.md",
);

async function loadPolishPrompt() {
  const file = Bun.file(SKILL_PATH);
  if (!(await file.exists())) {
    console.error(`Skill file not found: ${SKILL_PATH}`);
    process.exit(1);
  }
  const raw = await file.text();
  const match = raw.match(/---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)/);
  return match ? match[1].trim() : raw.trim();
}

function prependToInput(prefix, fileContent, input) {
  const parts = [prefix, fileContent, input].filter(Boolean);
  return parts.join("\n\n");
}

async function main() {
  const { file, prefix } = parseArgs();

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

  const [systemPrompt, fileContent] = await Promise.all([
    loadPolishPrompt(),
    loadFileContent(file),
  ]);

  const oneshot = file || prefix;
  if (oneshot) {
    const stdinText = process.stdin.isTTY ? "" : await Bun.stdin.text();
    const input = prependToInput(prefix, fileContent, stdinText);
    await runOneshot(client, resolvedModel, { systemPrompt, input });
  } else {
    await readLines(async (input) => {
      await runOneshot(client, resolvedModel, { systemPrompt, input });
    });
  }
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
