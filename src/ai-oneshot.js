#!/usr/bin/env bun
/**
 * One-shot OpenAI chat completion: read user content from stdin, optional system
 * prompt from -s/--system, stream response to stdout.
 *
 * With -f/--file or positional args: read stdin once (or skip on TTY), send, exit.
 * Otherwise: interactive line mode.
 *
 * Positional args are prepended to the user prompt.
 */
import { parseArgs as parseArgsUtil } from "node:util";
import { readLines } from "./lib/io.js";
import { OpenAI, runOneshot } from "./lib/openai.js";
import { getOpenAICredentials } from "./lib/secrets.js";

const USAGE = `Usage: ai-oneshot [options] [user prompt...]

Send stdin (or piped input) to OpenAI, stream response to stdout.

Options:
  -f, --file <path>     Prepend contents of file to the user message
  -s, --system <text>  System prompt (instruction for the model)
  -h, --help            Show this help
`;

function parseArgs() {
  const { values, positionals } = parseArgsUtil({
    allowPositionals: true,
    options: {
      file: { type: "string", short: "f" },
      help: { type: "boolean", short: "h" },
      system: { type: "string", short: "s" },
    },
  });
  if (values.help) {
    console.log(USAGE.trim());
    process.exit(0);
  }
  const prefix = positionals.length ? positionals.join(" ") : "";
  return {
    file: values.file ?? null,
    prefix,
    systemPrompt: values.system ?? null,
  };
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

function prependToInput(prefix, fileContent, input) {
  const parts = [prefix, fileContent, input].filter(Boolean);
  return parts.join("\n\n");
}

async function main() {
  const { file, prefix, systemPrompt } = parseArgs();

  const { apiKey, baseURL, model } = await getOpenAICredentials();
  const client = new OpenAI({ apiKey, baseURL });

  const fileContent = await loadFileContent(file);

  const oneshot = file || prefix;
  if (oneshot) {
    const stdinText = process.stdin.isTTY ? "" : await Bun.stdin.text();
    const input = prependToInput(prefix, fileContent, stdinText);
    await runOneshot(client, model, { systemPrompt, input });
  } else {
    await readLines(async (input) => {
      await runOneshot(client, model, { systemPrompt, input });
    });
  }
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
