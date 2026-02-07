#!/usr/bin/env bun
/**
 * Polish text from stdin using the prompt in ai/skills/polish/SKILL.md.
 * Sends completion request (OpenAI) and writes the polished text to stdout.
 *
 * TTY mode: read lines in a loop, polish each with streaming response.
 * Pipe mode: read all stdin, polish once, exit.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { home } from "./lib/env.js";
import { readLines, readStdin } from "./lib/io.js";
import { getOpenAIClient, runOneshot } from "./lib/openai.js";
import { getSecret } from "./lib/secrets.js";

function parseArgs(argv) {
    let file = null;
    const rest = [];
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "-f" || arg === "--file") {
            file = argv[i + 1] ?? "";
            i += 1;
            continue;
        }
        if (arg.startsWith("--file=")) {
            file = arg.slice("--file=".length);
            continue;
        }
        rest.push(arg);
    }
    return { file, rest };
}

function loadFileContent(filePath) {
    if (!filePath) return null;
    try {
        return readFileSync(filePath, "utf8");
    } catch (err) {
        if (err?.code === "ENOENT") {
            console.error(`File not found: ${filePath}`);
            process.exit(1);
        }
        throw err;
    }
}

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

async function main() {
    const argv = process.argv.slice(2);
    const { file } = parseArgs(argv);

    const apiKey = await getSecret("openai-api-key", "OPENAI_API_KEY");
    const baseURL =
        (await getSecret("openai-base-url", "OPENAI_BASE_URL")) ?? "https://api.openai.com";
    const model =
        (await getSecret("openai-model", "OPENAI_MODEL")) ?? "gpt-4o-mini";
    const { client, model: resolvedModel } = getOpenAIClient({
        apiKey,
        baseURL,
        model,
    });

    const systemPrompt = loadPolishPrompt();
    let fileContent = loadFileContent(file);

    if (process.stdin.isTTY) {
        // Line mode: read lines in a loop
        await readLines(async (input) => {
            if (fileContent) {
                // First line: send file content along with input, then clear
                input = `${fileContent}\n\n${input}`;
                fileContent = null;
            }
            await runOneshot(client, resolvedModel, { systemPrompt, input });
        });
    } else {
        // Pipe mode: read all stdin, polish once
        let input = await readStdin();
        if (fileContent) {
            input = `${fileContent}\n\n${input}`;
        }
        await runOneshot(client, resolvedModel, { systemPrompt, input });
    }
}

main().catch((err) => {
    console.error(err?.message ?? err);
    process.exit(1);
});
