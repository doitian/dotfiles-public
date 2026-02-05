#!/usr/bin/env bun
/**
 * Update all apps (Linux/macOS): apt, brew, paru, uv, bun.
 * #MISE hide=true alias="g:up" dir="~" description="Update all apps"
 */
import { runCapture, runInherit } from "../lib/run.js";

async function hasCommand(cmd, args = []) {
    const { code, stdout } = await runCapture(cmd, args);
    return code === 0 && (stdout || "").trim().length > 0;
}

async function main() {
    if (await hasCommand("sh", ["-c", "command -v apt"])) {
        await runInherit("sh", ["-c", "sudo apt update && sudo apt upgrade -y"]);
    }
    if (await hasCommand("sh", ["-c", "command -v brew"])) {
        await runInherit("sh", ["-c", "brew update && brew upgrade"]);
    }
    if (await hasCommand("sh", ["-c", "command -v paru"])) {
        await runInherit("sh", ["-c", "paru -Syu"]);
    }
    if (await hasCommand("uv", ["--version"])) {
        await runInherit("mise", ["run", "g:up:uv"]);
    }
    if (await hasCommand("bun", ["--version"])) {
        await runInherit("mise", ["run", "g:up:bun"]);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
