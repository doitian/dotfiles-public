#!/usr/bin/env bun
import { writeFileSync } from "node:fs";
import { $ } from "bun";

async function main() {
    writeFileSync("mise.toml", "", { flag: "a" });

    await $`mise tasks add pre-commit:cargo-fmt -- cargo fmt --check`.nothrow();

    const whichR = await $`mise which cargo-nextest`.quiet().nothrow().catch(() =>
        Promise.resolve({ stdout: Buffer.from("") })
    );
    const stdout = (whichR.stdout?.toString() ?? "").trim();
    const hasNextest = stdout.length > 0;

    const testRun = hasNextest
        ? "cargo nextest run --no-fail-fast{% for f in usage.filters | default(value=[]) %} {{ f }}{% endfor %}"
        : "cargo test --no-fail-fast --{% for f in usage.filters | default(value=[]) %} {{ f }}{% endfor %}";
    await $`mise config set tasks.test.run ${testRun}`.nothrow();
    await $`mise config set tasks.test.usage ${'arg "[filters]" var=#true'}`.nothrow();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
