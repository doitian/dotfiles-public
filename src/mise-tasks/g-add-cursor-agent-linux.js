#!/usr/bin/env bun
/**
 * Install cursor-agent cli (Linux/macOS): curl | bash
 * #MISE hide=true dir="~" description="Install cursor-agent cli"
 */
import { runInherit } from "../lib/run.js";

async function main() {
    await runInherit("sh", [
        "-c",
        "curl https://cursor.com/install -fsS | bash",
    ]);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
