#!/usr/bin/env bun
/**
 * Bundle every build.js entrypoint in memory, without compiling binaries, so CI
 * catches broken imports in scripts that have no tests.
 */
import { Glob } from "bun";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const glob = new Glob("*.js");
const entrypoints = [];
for (const dir of ["src", "src/mise-tasks", "src/niri-scripts"]) {
  for await (const file of glob.scan(join(root, dir))) entrypoints.push(join(root, dir, file));
}

const result = await Bun.build({ entrypoints, target: "bun", throw: false });
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
console.log(`Bundled ${entrypoints.length} entrypoints.`);
