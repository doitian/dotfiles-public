#!/usr/bin/env bun
import { $ } from "bun";
import { queryHistoryFile } from "./lib/fzf.js";
import { findModelOption } from "./lib/model-option.js";

function fail(message) {
  console.error(`foc: ${message}`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const separator = args.indexOf("--");
  const option = findModelOption(args, separator);
  if (option && (!option.value || option.value.startsWith("-"))) {
    fail(`${option.flag} requires a model filter`);
  }
  const history = await queryHistoryFile("foc");
  const fzfArgs = ["--no-multi", "--ignore-case", `--history=${history}`];
  if (option) fzfArgs.push(`--query=${option.value}`, "--select-1", "--exit-0");
  const result = await $`opencode models | fzf ${fzfArgs}`.quiet().nothrow();
  process.stderr.write(result.stderr);
  if (result.exitCode !== 0) process.exit(result.exitCode);
  const selected = result.stdout.toString().trim();
  if (!selected) process.exit(1);

  const rest = option
    ? args.slice(0, option.index).concat(args.slice(option.index + option.span))
    : args.slice();
  if (rest[0] === "--") rest.shift();

  const env = { ...process.env };
  if (rest[0] === "run" || rest[0] === "mini") {
    rest.splice(1, 0, "--model", selected);
  } else {
    // The TUI has no model flag; an inline config model becomes the default,
    // but only a private server reads it, so force --standalone.
    let inline = {};
    if (env.OPENCODE_CONFIG_CONTENT) {
      try {
        inline = JSON.parse(env.OPENCODE_CONFIG_CONTENT);
      } catch {
        fail("OPENCODE_CONFIG_CONTENT is not valid JSON");
      }
    }
    env.OPENCODE_CONFIG_CONTENT = JSON.stringify({ ...inline, model: selected });
    const connects = (flag) =>
      rest.includes(flag) || rest.some((arg) => arg.startsWith(`${flag}=`));
    if (!rest.includes("--standalone") && !connects("--server")) {
      rest.unshift("--standalone");
    }
    if (connects("--server")) {
      console.error("foc: note: a shared server keeps its configured model");
    }
    if (connects("--continue") || connects("--session") || rest.includes("-c") || rest.includes("-s")) {
      console.error("foc: note: a continued session keeps its current model");
    }
  }

  const opencode = Bun.spawn(["opencode", ...rest], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env,
  });
  process.exit(await opencode.exited);
}

main().catch((error) => {
  console.error(`foc: ${error.message}`);
  process.exit(1);
});
