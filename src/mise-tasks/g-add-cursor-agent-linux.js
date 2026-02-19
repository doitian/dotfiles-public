#!/usr/bin/env bun
import { $ } from "bun";

async function main() {
    await $`sh -c "curl https://cursor.com/install -fsS | bash"`.nothrow();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
