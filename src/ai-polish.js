#!/usr/bin/env node
/**
 * Polish text from stdin using the prompt in ai/skills/polish/SKILL.md.
 * Sends completion request (OpenAI) and writes the polished text to stdout.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_OPENAI_API_KEY,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
} from "./lib/config.js";
import { home } from "./lib/env.js";
import { readStdin } from "./lib/io.js";
import { getOpenAIClient, runOneshot } from "./lib/openai.js";

const SKILL_PATH = join(
  home(),
  ".dotfiles",
  "repos",
  "public",
  "ai",
  "skills",
  "polish",
  "SKILL.md"
);

function loadPolishPrompt() {
  try {
    const raw = readFileSync(SKILL_PATH, "utf8");
    const match = raw.match(/---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)/);
    return match ? match[1].trim() : raw.trim();
  } catch (err) {
    if (err?.code === "ENOENT") {
      console.error(`Skill file not found: ${SKILL_PATH}`);
      process.exit(1);
    }
    throw err;
  }
}

function main() {
  const { client, model } = getOpenAIClient({
    apiKey: DEFAULT_OPENAI_API_KEY,
    baseURL: DEFAULT_OPENAI_BASE_URL,
    model: DEFAULT_OPENAI_MODEL,
  });
  (async () => {
    const input = await readStdin();
    await runOneshot(client, model, {
      systemPrompt: loadPolishPrompt(),
      input,
    });
  })().catch((err) => {
    console.error(err?.message ?? err);
    process.exit(1);
  });
}

main();
