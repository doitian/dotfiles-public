#!/usr/bin/env bun
/**
 * Install cursor-agent cli (Linux/macOS): curl | bash
 * #MISE hide=true dir="~" description="Install cursor-agent cli"
 */
import { $ } from "bun";

async function main() {
    await $`sh -c "curl https://cursor.com/install -fsS | bash"`.nothrow();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
