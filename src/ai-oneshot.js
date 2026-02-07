#!/usr/bin/env bun
/**
 * One-shot OpenAI chat completion: read user content from stdin, optional system
 * prompt from -s/--system, stream response to stdout.
 *
 * TTY mode: read lines in a loop, send each with streaming response.
 * Pipe mode: read all stdin, send once, exit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readLines, readStdin } from "./lib/io.js";
import { getOpenAIClient, runOneshot } from "./lib/openai.js";
import { getSecret } from "./lib/secrets.js";

function parseArgs(argv) {
    let systemPrompt = null;
    let file = null;
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
    return { systemPrompt, file, rest };
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

async function main() {
    const argv = process.argv.slice(2);
    const { systemPrompt, file } = parseArgs(argv);

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
        // Pipe mode: read all stdin, send once
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
