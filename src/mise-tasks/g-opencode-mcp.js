#!/usr/bin/env bun
import { join } from "node:path";
import { home } from "../lib/env";
import { exists } from "../lib/fs";

const TEMPLATE = join(
    home(),
    ".dotfiles/repos/public/ai/opencode/opencode.jsonc",
);
const FILE = join(home(), ".config/opencode/opencode.jsonc");

function usage(code = 1) {
    console.error("Usage: g-opencode-mcp [--disable] <name>");
    process.exit(code);
}

function parseArgs(argv) {
    let disable = false;
    let name;
    for (const arg of argv) {
        if (arg === "--disable") {
            disable = true;
        } else if (arg === "-h" || arg === "--help") {
            usage(0);
        } else if (arg.startsWith("-")) {
            console.error(`Unknown flag: ${arg}`);
            usage(1);
        } else if (name == null) {
            name = arg;
        } else {
            console.error(`Unexpected argument: ${arg}`);
            usage(1);
        }
    }
    if (name == null) usage(1);
    return { disable, name };
}

async function readJson(path) {
    return JSON.parse(await Bun.file(path).text());
}

async function writeJson(path, data) {
    await Bun.write(path, `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
    const { disable, name } = parseArgs(process.argv.slice(2));

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

    const config = (await exists(FILE))
        ? await readJson(FILE)
        : { $schema: "https://opencode.ai/config.json" };
    config.mcp ??= {};

    if (disable) {
        if (config.mcp[name] == null) {
            console.log(`${name} mcp not configured`);
            return;
        }
        if (config.mcp[name].enabled === false) {
            console.log(`${name} mcp already disabled`);
            return;
        }
        config.mcp[name].enabled = false;
        await writeJson(FILE, config);
        console.log(`${name} mcp disabled`);
        return;
    }

    if (config.mcp[name]?.enabled === true) {
        console.log(`${name} mcp already enabled`);
        return;
    }

    config.mcp[name] = { ...mcpTemplate, enabled: true };
    await writeJson(FILE, config);
    console.log(`${name} mcp enabled`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
