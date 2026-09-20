#!/usr/bin/env bun
/** Create or attach a tmux session for a project directory. */
import { stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { $ } from "bun";

const DEFAULT_CONFIG_FILE = ".tmux-up.conf";

async function isFile(path) {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
}

async function isDirectory(path) {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

function sessionName(rootDir, configFile) {
    let session = basename(rootDir).replace(/^\./, "");
    if (configFile !== DEFAULT_CONFIG_FILE) {
        const extra = configFile.replace(/^\.tmux-/, "").replace(/\.conf$/, "");
        session = `${session}/${extra}`;
    }
    return session.replaceAll(/[.:]/g, "_");
}

async function configCommands(configPath) {
    if (await isFile(configPath)) {
        const text = await Bun.file(configPath).text();
        return (
            text
                .split(/\n/)
                .filter((line) => line.length > 0)
                .join("\n") + "\n\n"
        );
    }
    const editor = process.env.EDITOR || "vim";
    return `send '${editor}' C-m\nneww -n shell\nselectw -t 1\n\n`;
}

async function main() {
    let rootDir = process.argv[2] ?? process.cwd();
    let configFile = DEFAULT_CONFIG_FILE;

    if (await isFile(rootDir)) {
        configFile = basename(rootDir);
        rootDir = dirname(rootDir);
    } else if (!(await isDirectory(rootDir))) {
        console.error(`${rootDir} does not exist!`);
        process.exit(1);
    }

    rootDir = resolve(rootDir);
    const session = sessionName(rootDir, configFile);
    const target = `=${session}`;

    const has = await $`tmux has-session -t ${target}`.quiet().nothrow();
    if (has.exitCode !== 0) {
        await $`tmux new -d -c ${rootDir} -s ${session}`;
        const commands = await configCommands(join(rootDir, configFile));
        const child = Bun.spawn(["tmux", "-C", "attach", "-t", target], {
            stdin: new Blob([commands]),
            stdout: "ignore",
            stderr: "inherit",
            env: { ...process.env, TMUX: "" },
        });
        const code = await child.exited;
        if (code !== 0) process.exit(code);
    }

    if (process.env.TMUX) {
        await $`tmux switchc -t ${target}`;
    } else {
        await $`tmux attach -t ${target}`;
    }
}

main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
});
