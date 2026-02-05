#!/usr/bin/env node
/**
 * Run script with uv: uv run if pyproject.toml/uv.lock exist, else uv run --script.
 * Port of default/bin/uvs.
 */
import { spawn } from "node:child_process";
import { exists } from "./lib/fs.js";

async function main() {
  const args = process.argv.slice(2).length ? process.argv.slice(2) : ["x.py"];
  const hasProject = (await exists("pyproject.toml")) || (await exists("uv.lock"));
  const uvArgs = hasProject ? ["run", ...args] : ["run", "--script", ...args];

  await new Promise((resolve, reject) => {
    const c = spawn("uv", uvArgs, { stdio: "inherit" });
    c.on("close", (code, sig) => {
      process.exit(code ?? (sig ? 128 + 2 : 0));
      resolve();
    });
    c.on("error", reject);
  });
}

main();
