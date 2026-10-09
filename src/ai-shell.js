#!/usr/bin/env bun
/**
 * Generate a shell command from a natural-language prompt using an LLM.
 * Adds a system prompt for shell generation and attaches OS & shell context.
 */
import { parseArgs as parseArgsUtil } from "node:util";
import { loadFileContent, prependToInput } from "./lib/ai-input.js";
import { resolveThinking, thinkingHelp } from "./lib/ai-thinking.js";
import { isPowerShell } from "./lib/env.js";
import { readStdin } from "./lib/io.js";
import { OpenAI, runOneshot } from "./lib/openai.js";
import { getOpenAICredentials } from "./lib/secrets.js";

const USAGE = `Usage: ai-shell [options] [user prompt...]

Generate a shell command from a natural-language description.

Options:
  -f, --file <path>    Prepend file contents to the user message (- for stdin)
  -m, --model <name>   Override OpenAI model
${thinkingHelp("low")}
  -h, --help           Show this help
`;

const SYSTEM_PROMPT = `You are a shell command assistant. Given the user's request and the provided OS/shell context, output exactly one shell command that fulfills the request. Output only the command itself: no explanation, no markdown code fences, no preamble. Use the correct syntax for the user's shell and OS. If the request is ambiguous or unsafe, prefer a safe, common interpretation.`;

function parseArgs() {
  const { values, positionals } = parseArgsUtil({
    allowPositionals: true,
    options: {
      file: { type: "string", short: "f" },
      help: { type: "boolean", short: "h" },
      model: { type: "string", short: "m" },
      thinking: { type: "string" },
    },
  });
  if (values.help) {
    console.log(USAGE.trim());
    process.exit(0);
  }
  return {
    file: values.file ?? null,
    model: values.model ?? null,
    thinking: resolveThinking(values.thinking, "low"),
    prompt: positionals.join(" ").trim(),
  };
}

function getOsInfo() {
  const platform = process.platform; // 'win32' | 'darwin' | 'linux' | ...
  const arch = process.arch;
  let shell = process.env.SHELL ?? "unknown";
  let shellName = "unknown";
  if (process.env.SHELL) {
    const base = shell.split(/[/\\]/).pop() ?? shell;
    shellName = base.replace(/^\./, ""); // e.g. zsh, bash
  } else if (process.platform === "win32") {
    if (isPowerShell()) {
      shellName = "PowerShell";
      shell = "pwsh.exe";
    } else {
      shellName = "cmd";
      shell = "cmd.exe";
    }
  }
  return {
    platform,
    arch,
    shell,
    shellName,
  };
}

function formatContext(osInfo) {
  const lines = [
    "OS & shell context:",
    `- Platform: ${osInfo.platform}`,
    `- Arch: ${osInfo.arch}`,
    `- Shell: ${osInfo.shellName} (${osInfo.shell})`,
  ];
  return lines.join("\n");
}

async function main() {
  const { file, model: cliModel, thinking, prompt: argsPrompt } = parseArgs();

  const fileContent = await loadFileContent(file);
  const stdinText = file !== "-" && (file || !argsPrompt) && !process.stdin.isTTY
    ? await readStdin()
    : "";
  const userPrompt = prependToInput(argsPrompt, fileContent, stdinText).trim();
  if (!userPrompt) {
    console.error("Usage: ai-shell [-f <path>] <prompt> or pipe prompt via stdin.");
    process.exit(1);
  }

  const { apiKey, baseURL, model } = await getOpenAICredentials();
  const selectedModel = cliModel ?? model;
  const client = new OpenAI({ apiKey, baseURL });

  const osInfo = getOsInfo();
  const context = formatContext(osInfo);
  const input = `${context}\n\nUser request: ${userPrompt}`;

  await runOneshot(client, selectedModel, {
    systemPrompt: SYSTEM_PROMPT,
    input,
    thinking,
  });
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
