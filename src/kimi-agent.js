#!/usr/bin/env bun
import {
  access,
  mkdir,
  readFile,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { getMoonshotCredentials } from "./lib/secrets.js";

const USAGE = `Usage: kimi-agent <claude|codex> [--effort <low|high|max>] [arguments...]

Launch Claude Code or Codex CLI with Kimi, then restore its configuration.
The Moonshot token is read from the secret store (MOONSHOT_API_KEY fallback).

Options:
  --effort <level>   Reasoning effort: low, high, or max (default: max)
  -h, --help         Show this help`;

function claudeEnv(effort) {
  return {
    ANTHROPIC_BASE_URL: "https://api.moonshot.cn/anthropic",
    ANTHROPIC_MODEL: "kimi-k3[1m]",
    ANTHROPIC_DEFAULT_OPUS_MODEL: "kimi-k3[1m]",
    ANTHROPIC_DEFAULT_SONNET_MODEL: "kimi-k3[1m]",
    ANTHROPIC_DEFAULT_HAIKU_MODEL: "kimi-k2.7-code",
    ANTHROPIC_DEFAULT_FABLE_MODEL: "kimi-k3[1m]",
    CLAUDE_CODE_SUBAGENT_MODEL: "kimi-k3[1m]",
    CLAUDE_CODE_AUTO_COMPACT_WINDOW: "1000000",
    CLAUDE_CODE_EFFORT_LEVEL: effort,
  };
}

const CLAUDE_CONFLICTING_ENV = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_SMALL_FAST_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL_NAME",
  "ANTHROPIC_DEFAULT_SONNET_MODEL_NAME",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME",
  "ANTHROPIC_DEFAULT_FABLE_MODEL_NAME",
];

function parseCliArgs() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return null;
  }

  let provider = null;
  let effort = "max";
  const args = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--effort") {
      effort = argv[++i];
      if (effort !== "low" && effort !== "high" && effort !== "max") {
        throw new Error(
          `Invalid --effort "${effort ?? "(missing)"}" (expected low, high, or max).\n\n${USAGE}`,
        );
      }
    } else if (provider === null) {
      provider = arg;
    } else {
      args.push(arg);
    }
  }

  if (provider !== "claude" && provider !== "codex") {
    throw new Error(`Expected provider "claude" or "codex".\n\n${USAGE}`);
  }
  return { provider, args, effort };
}

async function replaceFileTemporarily(path, content) {
  let original = null;
  let parentExisted = true;
  try {
    original = await readFile(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    await access(dirname(path));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    parentExisted = false;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);

  return async () => {
    if (original === null) {
      await rm(path, { force: true });
      if (!parentExisted) {
        try {
          await rmdir(dirname(path));
        } catch (error) {
          if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY")
            throw error;
        }
      }
    } else {
      await writeFile(path, original);
    }
  };
}

async function configureClaude(effort) {
  const path = join(homedir(), ".claude", "settings.json");
  let settings = {};
  try {
    settings = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (
    settings === null ||
    Array.isArray(settings) ||
    typeof settings !== "object"
  ) {
    throw new Error(`${path} must contain a JSON object`);
  }
  if (
    settings.env !== undefined &&
    (settings.env === null ||
      Array.isArray(settings.env) ||
      typeof settings.env !== "object")
  ) {
    throw new Error(`${path} must contain an object at "env"`);
  }

  settings.env = { ...(settings.env ?? {}), ...claudeEnv(effort) };
  for (const name of CLAUDE_CONFLICTING_ENV) delete settings.env[name];
  return replaceFileTemporarily(path, `${JSON.stringify(settings, null, 2)}\n`);
}

function configureCodexToml(source, effort) {
  const lines = source.split(/\r?\n/);
  const firstTable = lines.findIndex((line) => /^\s*\[/.test(line));
  const topLevelEnd = firstTable === -1 ? lines.length : firstTable;
  const topLevel = lines
    .slice(0, topLevelEnd)
    .filter(
      (line) =>
        !/^\s*(model|model_provider|model_reasoning_effort|model_context_window)\s*=/.test(
          line,
        ),
    );

  const tables = [];
  let skipKimiProvider = false;
  for (const line of lines.slice(topLevelEnd)) {
    const table = line.match(/^\s*\[\[?([^\]]+)\]\]?\s*(?:#.*)?$/)?.[1];
    if (table) {
      skipKimiProvider =
        table === "model_providers.kimi" ||
        table.startsWith("model_providers.kimi.");
    }
    if (!skipKimiProvider) tables.push(line);
  }

  const original = [...topLevel, ...tables].join("\n").trimEnd();
  return `model = "kimi-k3"
model_provider = "kimi"
model_reasoning_effort = "${effort}"
model_context_window = 1048576

${original}${original ? "\n\n" : ""}[model_providers.kimi]
name = "Kimi"
base_url = "https://api.moonshot.cn/v1"
env_key = "KIMI_API_KEY"
wire_api = "responses"
`;
}

async function configureCodex(effort) {
  const path = join(homedir(), ".codex", "config.toml");
  let source = "";
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return replaceFileTemporarily(path, configureCodexToml(source, effort));
}

async function launch(command, args, env) {
  const child = Bun.spawn([command, ...args], {
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const signals =
    process.platform === "win32"
      ? ["SIGINT", "SIGTERM"]
      : ["SIGINT", "SIGTERM", "SIGHUP"];
  const handlers = new Map(
    signals.map((signal) => [signal, () => child.kill(signal)]),
  );
  for (const [signal, handler] of handlers) process.on(signal, handler);
  try {
    return await child.exited;
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler);
  }
}

async function main() {
  const options = parseCliArgs();
  if (!options) return 0;

  const { token } = await getMoonshotCredentials();
  const env = { ...process.env, KIMI_API_KEY: token };
  let restore;

  try {
    if (options.provider === "claude") {
      restore = await configureClaude(options.effort);
      for (const name of CLAUDE_CONFLICTING_ENV) delete env[name];
      Object.assign(env, claudeEnv(options.effort), {
        ANTHROPIC_AUTH_TOKEN: token,
      });
      return await launch("claude", options.args, env);
    }

    restore = await configureCodex(options.effort);
    return await launch("codex", options.args, env);
  } finally {
    await restore?.();
  }
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(error?.message ?? error);
    process.exitCode = 1;
  });
