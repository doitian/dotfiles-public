#!/usr/bin/env bun
/**
 * Setup rust project: pre-commit:cargo-fmt and test task config.
 */
import { writeFileSync } from "node:fs";
import { runInherit, runCapture } from "../lib/run.js";

async function main() {
    writeFileSync("mise.toml", "", { flag: "a" });

    await runInherit("mise", ["tasks", "add", "pre-commit:cargo-fmt", "--", "cargo", "fmt", "--check"]);

    const { stdout } = await runCapture("mise", ["which", "cargo-nextest"]).catch(() =>
        Promise.resolve({ stdout: "" })
    );
    const hasNextest = (stdout || "").trim().length > 0;

    const testRun = hasNextest
        ? "cargo nextest run --no-fail-fast{% for f in usage.filters | default(value=[]) %} {{ f }}{% endfor %}"
        : "cargo test --no-fail-fast --{% for f in usage.filters | default(value=[]) %} {{ f }}{% endfor %}";
    await runInherit("mise", ["config", "set", "tasks.test.run", testRun]);
    await runInherit("mise", ["config", "set", "tasks.test.usage", 'arg "[filters]" var=#true']);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
