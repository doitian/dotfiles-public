#!/usr/bin/env bun
/**
 * Detect build system and add mise default task.
 */
import { writeFileSync } from "node:fs";
import { exists } from "../lib/fs.js";
import { $ } from "bun";

async function main() {
    if (!(await exists("mise.toml"))) writeFileSync("mise.toml", "");

    if (await exists("Makefile") || await exists("makefile") || await exists("GNUmakefile")) {
        await $`mise tasks add default -- make`.nothrow();
        return;
    }
    if (await exists("Cargo.toml")) {
        await $`mise tasks add default -- cargo build`.nothrow();
        return;
    }
    if (await exists("go.mod")) {
        await $`mise tasks add default -- go build`.nothrow();
        return;
    }
    if (await exists("pyproject.toml")) {
        await $`mise tasks add default -- python -m build`.nothrow();
        return;
    }
    if (await exists("CMakeLists.txt")) {
        await $`mise tasks add default -- cmake --build build`.nothrow();
        return;
    }
    if (await exists("stack.yaml")) {
        await $`mise tasks add default -- stack build`.nothrow();
        return;
    }
    if (await exists("package.json")) {
        if (await exists("pnpm-lock.yaml")) {
            await $`mise tasks add default -- pnpm run build`.nothrow();
        } else if (await exists("yarn.lock")) {
            await $`mise tasks add default -- yarn build`.nothrow();
        } else if (await exists("bun.lockb")) {
            await $`mise tasks add default -- bun run build`.nothrow();
        } else {
            await $`mise tasks add default -- npm run build`.nothrow();
        }
        return;
    }

    console.error("No recognizable build system found");
    process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
