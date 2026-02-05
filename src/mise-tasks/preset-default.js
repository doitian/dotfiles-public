#!/usr/bin/env bun
/**
 * Detect build system and add mise default task.
 */
import { writeFileSync } from "node:fs";
import { exists } from "../lib/fs.js";
import { runInherit } from "../lib/run.js";

async function main() {
    if (!(await exists("mise.toml"))) writeFileSync("mise.toml", "");

    if (await exists("Makefile") || await exists("makefile") || await exists("GNUmakefile")) {
        await runInherit("mise", ["tasks", "add", "default", "--", "make"]);
        return;
    }
    if (await exists("Cargo.toml")) {
        await runInherit("mise", ["tasks", "add", "default", "--", "cargo", "build"]);
        return;
    }
    if (await exists("package.json")) {
        if (await exists("pnpm-lock.yaml")) {
            await runInherit("mise", ["tasks", "add", "default", "--", "pnpm", "run", "build"]);
        } else if (await exists("yarn.lock")) {
            await runInherit("mise", ["tasks", "add", "default", "--", "yarn", "build"]);
        } else if (await exists("bun.lockb")) {
            await runInherit("mise", ["tasks", "add", "default", "--", "bun", "run", "build"]);
        } else {
            await runInherit("mise", ["tasks", "add", "default", "--", "npm", "run", "build"]);
        }
        return;
    }
    if (await exists("go.mod")) {
        await runInherit("mise", ["tasks", "add", "default", "--", "go", "build"]);
        return;
    }
    if (await exists("pyproject.toml")) {
        await runInherit("mise", ["tasks", "add", "default", "--", "python", "-m", "build"]);
        return;
    }
    if (await exists("CMakeLists.txt")) {
        await runInherit("mise", ["tasks", "add", "default", "--", "cmake", "--build", "build"]);
        return;
    }
    if (await exists("meson.build")) {
        await runInherit("mise", [
            "tasks",
            "add",
            "default",
            "--",
            "meson",
            "compile",
            "-C",
            "builddir",
        ]);
        return;
    }

    console.error("No recognizable build system found");
    process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
