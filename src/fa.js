#!/usr/bin/env bun
import { join } from "node:path";
import { $ } from "bun";
import { readCache, writeCache } from "./lib/cache.js";
import { stateDir } from "./lib/env.js";
import { queryHistoryFile } from "./lib/fzf.js";

function fail(message) {
  console.error(`fa: ${message}`);
  process.exit(1);
}

/** Return stdout of a successful command, forwarding its stderr; throws otherwise. */
function output(result) {
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString().trim() || `command exited with code ${result.exitCode}`);
  }
  process.stderr.write(result.stderr);
  return result.stdout.toString();
}

const MODEL_CACHE_TTL_MS = 60 * 60 * 1000;

const AGENTS = [
  {
    name: "opencode",
    bin: "opencode",
    aliases: ["opencode", "oc"],
    async models() {
      return output(await $`opencode models`.quiet().nothrow())
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    },
    launch(model, args, env) {
      if (args[0] === "run" || args[0] === "mini") {
        return { args: [args[0], "--model", model, ...args.slice(1)], env };
      }
      // The TUI has no model flag; an inline config model becomes the default,
      // but only a private server reads it, so force --standalone.
      let inline = {};
      if (env.OPENCODE_CONFIG_CONTENT) {
        try {
          inline = JSON.parse(env.OPENCODE_CONFIG_CONTENT);
        } catch {
          fail("OPENCODE_CONFIG_CONTENT is not valid JSON");
        }
      }
      env.OPENCODE_CONFIG_CONTENT = JSON.stringify({ ...inline, model });
      const rest = [...args];
      const connects = (flag) =>
        rest.includes(flag) || rest.some((arg) => arg.startsWith(`${flag}=`));
      if (!rest.includes("--standalone") && !connects("--server")) {
        rest.unshift("--standalone");
      }
      if (connects("--server")) {
        console.error("fa: note: a shared server keeps its configured model");
      }
      if (connects("--continue") || connects("--session") || rest.includes("-c") || rest.includes("-s")) {
        console.error("fa: note: a continued session keeps its current model");
      }
      return { args: rest, env };
    },
  },
  {
    name: "pi",
    bin: "pi",
    aliases: ["pi"],
    async models() {
      return output(await $`pi --list-models`.quiet().nothrow())
        .split("\n")
        .slice(1)
        .map((line) => line.trim().split(/\s+/))
        .filter(([provider, model]) => provider && model)
        .map(([provider, model]) => `${provider}/${model}`);
    },
    launch(model, args) {
      return { args: ["--model", model, ...args] };
    },
  },
];

function findAgentOption(args) {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "-a" || arg === "--agent") {
      return { index, span: 2, flag: arg, value: args[index + 1] };
    }
    if (arg.startsWith("--agent=")) {
      return { index, span: 1, flag: "--agent", value: arg.slice("--agent=".length) };
    }
  }
  return null;
}

function resolveAgent(value) {
  const agent = AGENTS.find((candidate) => candidate.aliases.includes(value));
  if (!agent) {
    const names = AGENTS.flatMap((candidate) => candidate.aliases).join(", ");
    fail(`unknown agent "${value}" (expected ${names})`);
  }
  return agent;
}

/** Fetch an agent's models, retrying once when the command fails or returns none. */
async function fetchModels(agent) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const models = await agent.models();
      if (models.length) return models;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  return [];
}

async function listModels(agents, explicit, refresh) {
  const results = await Promise.all(
    agents.map(async (agent) => {
      if (!Bun.which(agent.bin)) return { agent, missing: true };
      const cachePath = join(stateDir(), "fa", `${agent.name}-models.json`);
      if (!refresh) {
        const cached = await readCache(cachePath, MODEL_CACHE_TTL_MS);
        if (Array.isArray(cached) && cached.length) return { agent, models: cached };
      }
      const models = await fetchModels(agent);
      if (models.length) await writeCache(cachePath, models);
      return { agent, models };
    }),
  );
  const lines = [];
  for (const { agent, missing, models } of results) {
    if (missing) {
      if (explicit) fail(`${agent.name} is not installed`);
      console.error(`fa: skipping ${agent.name}: ${agent.bin} not found`);
      continue;
    }
    for (const model of models) lines.push(`${agent.name}\t${model}`);
  }
  return lines;
}

async function main() {
  const args = process.argv.slice(2);
  const separator = args.indexOf("--");
  const before = separator === -1 ? args : args.slice(0, separator);
  const forwarded = separator === -1 ? [] : args.slice(separator + 1);

  const option = findAgentOption(before);
  if (option && (!option.value || option.value.startsWith("-"))) {
    fail(`${option.flag} requires an agent`);
  }
  const agents = option ? [resolveAgent(option.value)] : AGENTS;
  if (option) before.splice(option.index, option.span);
  const refreshIndex = before.indexOf("-r");
  const refresh = refreshIndex !== -1;
  if (refresh) before.splice(refreshIndex, 1);
  const query = before.join(" ").trim();

  const lines = await listModels(agents, Boolean(option), refresh);
  if (!lines.length) fail("no models found");

  const history = await queryHistoryFile("fa");
  const fzfArgs = ["--no-multi", "--ignore-case", `--history=${history}`];
  if (query) fzfArgs.push(`--query=${query}`);
  const picker = Bun.spawn(["fzf", ...fzfArgs], {
    stdin: new Blob([lines.join("\n") + "\n"]),
    stdout: "pipe",
    stderr: "inherit",
  });
  const selected = (await new Response(picker.stdout).text()).trim();
  const pickerCode = await picker.exited;
  if (pickerCode !== 0) process.exit(pickerCode);
  if (!selected) process.exit(1);

  const [agentName, model] = selected.split("\t");
  const agent = AGENTS.find((candidate) => candidate.name === agentName);
  if (!agent || !model) fail(`unexpected selection from fzf: ${selected}`);

  const env = { ...process.env };
  const launch = agent.launch(model, forwarded, env);
  const child = Bun.spawn([agent.bin, ...launch.args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: launch.env ?? env,
  });
  process.exit(await child.exited);
}

main().catch((error) => {
  console.error(`fa: ${error.message}`);
  process.exit(1);
});