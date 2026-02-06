#!/usr/bin/env bun
/**
 * Update all apps (Linux/macOS): apt, brew, paru, uv, bun.
 * #MISE hide=true alias="g:up" dir="~" description="Update all apps"
 */
import { $ } from "bun";

async function hasCommand(cmd, args = []) {
    const r = await $`${cmd} ${args}`.quiet().nothrow();
    return r.exitCode === 0 && ((r.stdout?.toString() ?? "").trim().length > 0);
}

async function main() {
    if (await hasCommand("sh", ["-c", "command -v apt"])) {
        await $`sh -c "sudo apt update && sudo apt upgrade -y"`.nothrow();
    }
    if (await hasCommand("sh", ["-c", "command -v brew"])) {
        await $`sh -c "brew update && brew upgrade"`.nothrow();
    }
    if (await hasCommand("sh", ["-c", "command -v paru"])) {
        await $`sh -c "paru -Syu"`.nothrow();
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
