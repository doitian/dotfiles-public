#!/usr/bin/env bun
import { join } from "node:path";
import { home } from "../lib/env";
import { exists } from "../lib/fs";

const TEMPLATE = join(
  home(),
  ".dotfiles/repos/public/ai/opencode/opencode.jsonc",
);

const AGENTS = ["opencode", "claude-desktop", "claude-code"];

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

function toClaudeEntry(mcpTemplate) {
  const entry = { ...mcpTemplate };
  delete entry.enabled;
  if (entry.type === "remote") entry.type = "http";
  return entry;
}

function usage(code = 1) {
  console.error(
    `Usage: g-mcp <agent> [--disable] <name>\nAgents: ${AGENTS.join(", ")}`,
  );
  process.exit(code);
}

function parseArgs(argv) {
  let disable = false;
  let agent;
  let name;
  for (const arg of argv) {
    if (arg === "--disable") {
      disable = true;
    } else if (arg === "-h" || arg === "--help") {
      usage(0);
    } else if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}`);
      usage(1);
    } else if (agent == null) {
      agent = arg;
    } else if (name == null) {
      name = arg;
    } else {
      console.error(`Unexpected argument: ${arg}`);
      usage(1);
    }
  }
  if (agent == null || name == null) usage(1);
  if (!AGENTS.includes(agent)) {
    console.error(`Unknown agent: ${agent}`);
    usage(1);
  }
  return { disable, agent, name };
}

async function readJson(path) {
  return JSON.parse(await Bun.file(path).text());
}

async function writeJson(path, data) {
  await Bun.write(path, `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  const { disable, agent, name } = parseArgs(process.argv.slice(2));
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

  if (cfg.style === "opencode") {
    if (disable) {
      if (servers[name] == null) {
        console.log(`${agent}: ${name} mcp not configured`);
        return;
      }
      if (servers[name].enabled === false) {
        console.log(`${agent}: ${name} mcp already disabled`);
        return;
      }
      servers[name].enabled = false;
      await writeJson(cfg.path, config);
      console.log(`${agent}: ${name} mcp disabled`);
      return;
    }

    if (servers[name]?.enabled === true) {
      console.log(`${agent}: ${name} mcp already enabled`);
      return;
    }

    servers[name] = { ...mcpTemplate, enabled: true };
    await writeJson(cfg.path, config);
    console.log(`${agent}: ${name} mcp enabled`);
    return;
  }

  // claude-code / claude-desktop: presence enables; no enabled flag
  if (disable) {
    if (servers[name] == null) {
      console.log(`${agent}: ${name} mcp not configured`);
      return;
    }
    delete servers[name];
    await writeJson(cfg.path, config);
    console.log(`${agent}: ${name} mcp disabled`);
    return;
  }

  if (servers[name] != null) {
    console.log(`${agent}: ${name} mcp already enabled`);
    return;
  }

  servers[name] = toClaudeEntry(mcpTemplate);
  await writeJson(cfg.path, config);
  console.log(`${agent}: ${name} mcp enabled`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
