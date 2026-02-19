#!/usr/bin/env bun
import { $ } from "bun";

async function hasCommand(cmd, args = []) {
    const r = await $`${cmd} ${args}`.quiet().nothrow().catch(() => ({ exitCode: 1 }));
    return r.exitCode === 0;
}

async function main() {
    const hasScoop = (await $`scoop --version`.quiet().nothrow()).exitCode === 0;
    if (hasScoop) {
        await $`scoop update -a`;
    }
    if (await hasCommand("uv", ["--version"])) {
        await $`mise run g:up:uv`.nothrow();
    }
    if (await hasCommand("bun", ["--version"])) {
        await $`mise run g:up:bun`.nothrow();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
