#!/usr/bin/env bun
import { touch } from "../lib/fs";
import { $ } from "bun";

async function main() {
	touch("mise.toml");

	await $`mise tasks add pre-commit:cargo-fmt -- cargo fmt --check`.nothrow();

	const hasNextest =
		(await $`cargo nextest --version`.quiet().nothrow()).exitCode == 0;

	const testRun = hasNextest
		? "cargo nextest run --no-fail-fast{% for f in usage.filters | default(value=[]) %} {{ f }}{% endfor %}"
		: "cargo test --no-fail-fast --{% for f in usage.filters | default(value=[]) %} {{ f }}{% endfor %}";
	await $`mise config set tasks.test.run ${testRun}`.nothrow();
	const usage = 'arg "[filters]" var=#true';
	await $`mise config set tasks.test.usage ${usage}`.nothrow();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
