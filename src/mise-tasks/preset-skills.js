#!/usr/bin/env bun
import { $ } from "bun";
import { mkdir, symlink } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { exists } from "../lib/fs.js";

const claude = join(".claude", "skills");
const agents = join(".agents", "skills");
const [hasClaude, hasAgents] = await Promise.all([exists(claude), exists(agents)]);

if (hasClaude !== hasAgents) {
  const path = hasClaude ? agents : claude;
  const value = relative(dirname(path), hasClaude ? claude : agents);
  await mkdir(dirname(path), { recursive: true });
  if (process.platform === "win32") {
    await $`cmd /c mklink /d "${path}" "${value}"`;
  } else {
    await symlink(value, path, "dir");
  }
}
