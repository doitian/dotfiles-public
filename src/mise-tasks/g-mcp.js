#!/usr/bin/env bun
import { join } from "node:path";
import { home } from "../lib/env";
import { exists } from "../lib/fs";

const TEMPLATE = join(
  home(),
  ".dotfiles/repos/public/ai/opencode/opencode.jsonc",
);

const AGENTS = ["opencode", "claude-desktop", "claude-code"];
const ACTIONS = ["enable", "disable", "status"];

function claudeDesktopConfigPath() {
  const h = home();
  if (process.platform === "darwin") {
    return join(
      h,
      "Library/Application Support/Claude/claude_desktop_config.json",
    );
  }
  if (process.platform === "win32") {
    return join(
      process.env.APPDATA || join(h, "AppData", "Roaming"),
      "Claude",
      "claude_desktop_config.json",
    );
  }
  return join(h, ".config", "Claude", "claude_desktop_config.json");
}

function agentConfig(agent) {
  if (agent === "opencode") {
    return {
      path: join(home(), ".config/opencode/opencode.jsonc"),
      defaultConfig: { $schema: "https://opencode.ai/config.json" },
      key: "mcp",
      style: "opencode",
    };
  }
  if (agent === "claude-code") {
    return {
      path: join(home(), ".claude.json"),
      defaultConfig: {},
      key: "mcpServers",
      style: "claude",
    };
  }
  if (agent === "claude-desktop") {
    return {
      path: claudeDesktopConfigPath(),
      defaultConfig: {},
      key: "mcpServers",
      style: "claude",
    };
  }
  return null;
}

function isRemoteTemplate(mcpTemplate) {
  return (
    mcpTemplate.type === "remote" ||
    mcpTemplate.type === "http" ||
    mcpTemplate.type === "sse" ||
    (mcpTemplate.url != null && mcpTemplate.command == null)
  );
}

// OpenCode local: { type: "local", command: string[], environment? }
// Claude stdio:   { command: string, args?: string[], env? }
function toClaudeStdioEntry(mcpTemplate) {
  const entry = {};

  if (Array.isArray(mcpTemplate.command)) {
    if (mcpTemplate.command.length === 0) {
      throw new Error("local mcp template missing command");
    }
    entry.command = mcpTemplate.command[0];
    if (mcpTemplate.command.length > 1) {
      entry.args = mcpTemplate.command.slice(1);
    }
  } else if (typeof mcpTemplate.command === "string") {
    entry.command = mcpTemplate.command;
    if (mcpTemplate.args != null) entry.args = mcpTemplate.args;
  } else {
    throw new Error("local mcp template missing command");
  }

  const env = mcpTemplate.environment ?? mcpTemplate.env;
  if (env != null) entry.env = env;

  return entry;
}

function toClaudeCodeEntry(mcpTemplate) {
  if (isRemoteTemplate(mcpTemplate)) {
    const entry = { ...mcpTemplate };
    delete entry.enabled;
    if (entry.type === "remote") entry.type = "http";
    return entry;
  }
  return toClaudeStdioEntry(mcpTemplate);
}

// Claude Desktop only accepts stdio servers in claude_desktop_config.json
// ({ command, args?, env? }). Bridge remote/http templates via mcp-remote.
function toClaudeDesktopEntry(mcpTemplate) {
  if (isRemoteTemplate(mcpTemplate)) {
    if (mcpTemplate.url == null) {
      throw new Error("remote mcp template missing url");
    }
    const args = ["mcp-remote", mcpTemplate.url];
    if (mcpTemplate.headers && typeof mcpTemplate.headers === "object") {
      for (const [key, value] of Object.entries(mcpTemplate.headers)) {
        args.push("--header", `${key}:${value}`);
      }
    }
    return { command: "bunx", args };
  }

  return toClaudeStdioEntry(mcpTemplate);
}

function toClaudeEntry(mcpTemplate, agent) {
  if (agent === "claude-desktop") return toClaudeDesktopEntry(mcpTemplate);
  return toClaudeCodeEntry(mcpTemplate);
}

function usage(code = 1) {
  console.error(
    `Usage: g-mcp <enable|disable|status> <agent> <name>\nAgents: ${AGENTS.join(", ")}`,
  );
  process.exit(code);
}

function parseArgs(argv) {
  let action;
  let agent;
  let name;
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      usage(0);
    } else if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}`);
      usage(1);
    } else if (action == null) {
      action = arg;
    } else if (agent == null) {
      agent = arg;
    } else if (name == null) {
      name = arg;
    } else {
      console.error(`Unexpected argument: ${arg}`);
      usage(1);
    }
  }
  if (action == null || agent == null || name == null) usage(1);
  if (!ACTIONS.includes(action)) {
    console.error(`Unknown action: ${action}`);
    usage(1);
  }
  if (!AGENTS.includes(agent)) {
    console.error(`Unknown agent: ${agent}`);
    usage(1);
  }
  return { action, agent, name };
}

async function readJson(path) {
  return JSON.parse(await Bun.file(path).text());
}

async function writeJson(path, data) {
  await Bun.write(path, `${JSON.stringify(data, null, 2)}\n`);
}

function mcpStatus(cfg, servers, name) {
  if (cfg.style === "opencode") {
    if (servers[name] == null) return "not configured";
    if (servers[name].enabled === false) return "disabled";
    return "enabled";
  }
  return servers[name] != null ? "enabled" : "not configured";
}

async function enable(cfg, servers, name, mcpTemplate, agent) {
  if (cfg.style === "opencode") {
    if (servers[name]?.enabled === true) {
      console.log(`${agent}: ${name} mcp already enabled`);
      return;
    }
    servers[name] = { ...mcpTemplate, enabled: true };
    return `${agent}: ${name} mcp enabled`;
  }

  if (servers[name] != null) {
    console.log(`${agent}: ${name} mcp already enabled`);
    return;
  }
  servers[name] = toClaudeEntry(mcpTemplate, agent);
  return `${agent}: ${name} mcp enabled`;
}

async function disable(cfg, servers, name, agent) {
  if (cfg.style === "opencode") {
    if (servers[name] == null) {
      console.log(`${agent}: ${name} mcp not configured`);
      return;
    }
    if (servers[name].enabled === false) {
      console.log(`${agent}: ${name} mcp already disabled`);
      return;
    }
    servers[name].enabled = false;
    return `${agent}: ${name} mcp disabled`;
  }

  if (servers[name] == null) {
    console.log(`${agent}: ${name} mcp not configured`);
    return;
  }
  delete servers[name];
  return `${agent}: ${name} mcp disabled`;
}

async function main() {
  const { action, agent, name } = parseArgs(process.argv.slice(2));
  const cfg = agentConfig(agent);

  if (!(await exists(TEMPLATE))) {
    console.error(`Template not found: ${TEMPLATE}`);
    process.exit(1);
  }

  const template = await readJson(TEMPLATE);
  const mcpTemplate = template.mcp?.[name];
  if (mcpTemplate == null) {
    console.error(`${name} mcp not in template`);
    process.exit(1);
  }

  const config = (await exists(cfg.path))
    ? await readJson(cfg.path)
    : { ...cfg.defaultConfig };
  config[cfg.key] ??= {};
  const servers = config[cfg.key];

  if (action === "status") {
    console.log(`${agent}: ${name} mcp ${mcpStatus(cfg, servers, name)}`);
    return;
  }

  const message =
    action === "enable"
      ? await enable(cfg, servers, name, mcpTemplate, agent)
      : await disable(cfg, servers, name, agent);

  if (message == null) return;

  await writeJson(cfg.path, config);
  console.log(message);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
