#!/usr/bin/env node
/**
 * One-shot OpenAI chat completion: read user content from stdin, optional system
 * prompt from -s/--system, stream response to stdout.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_OPENAI_API_KEY,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
} from "./lib/config.js";
import { readStdin } from "./lib/io.js";
import { getOpenAIClient, runOneshot } from "./lib/openai.js";

function parseArgs(argv) {
  let systemPrompt = null;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-s" || arg === "--system") {
      systemPrompt = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg.startsWith("--system=")) {
      systemPrompt = arg.slice("--system=".length);
      continue;
    }
    rest.push(arg);
  }
  return { systemPrompt, rest };
}

function main() {
  const argv = process.argv.slice(2);
  const { systemPrompt } = parseArgs(argv);

  const { client, model } = getOpenAIClient({
    apiKey: DEFAULT_OPENAI_API_KEY,
    baseURL: DEFAULT_OPENAI_BASE_URL,
    model: DEFAULT_OPENAI_MODEL,
  });

  (async () => {
    const input = await readStdin();
    await runOneshot(client, model, { systemPrompt, input });
  })().catch((err) => {
    console.error(err?.message ?? err);
    process.exit(1);
  });
}

const isMain =
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (isMain) main();
