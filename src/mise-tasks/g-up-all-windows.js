#!/usr/bin/env bun
/**
 * Update all apps (Windows): scoop, uv, bun. depends_post g:clean:scoop in global.toml.
 * #MISE hide=true alias="g:up" dir="~" depends_post=["g:clean:scoop"] description="Update all apps"
 */
import { runCapture, runInherit } from "../lib/run.js";

async function hasCommand(cmd, args = []) {
    const { code } = await runCapture(cmd, args).catch(() => ({ code: 1 }));
    return code === 0;
}

async function main() {
    await runInherit("scoop", ["update", "-a"]);
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
