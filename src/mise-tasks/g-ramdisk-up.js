#!/usr/bin/env bun
import { access, readdir, lstat, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { home } from "../lib/env";

const CODEBASE_DIR = join(home(), "codebase");
const TARGET_SHM_FLAG = ".target.shm";

async function directDirectories(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(dir, entry.name));
  } catch (err) {
    if (err?.code === "ENOENT") return [];
    throw err;
  }
}

async function projects() {
  const codebaseProjects = await directDirectories(CODEBASE_DIR);
  const worktreeRoots = codebaseProjects.filter((dir) =>
    dir.endsWith(".worktrees"),
  );
  const worktreeProjects = (
    await Promise.all(worktreeRoots.map((dir) => directDirectories(dir)))
  ).flat();
  return [...codebaseProjects, ...worktreeProjects];
}

async function hasBrokenTargetSymlink(project) {
  const target = join(project, "target");
  try {
    const targetStat = await lstat(target);
    if (!targetStat.isSymbolicLink()) return false;
  } catch (err) {
    if (err?.code === "ENOENT") return false;
    throw err;
  }

  try {
    await stat(target);
    return false;
  } catch (err) {
    if (err?.code === "ENOENT") return true;
    throw err;
  }
}

async function hasTargetShmFlag(project) {
  try {
    await access(join(project, TARGET_SHM_FLAG));
    return true;
  } catch (err) {
    if (err?.code === "ENOENT") return false;
    throw err;
  }
}

async function main() {
  const processedProjects = [];

  for (const project of await projects()) {
    if (await hasTargetShmFlag(project)) {
      console.log(`Mounting ramdisk for ${project}`);
      await $`cargo ramdisk mount -c`.cwd(project);
      await unlink(join(project, TARGET_SHM_FLAG));
      processedProjects.push(project);
      continue;
    }

    if (!(await hasBrokenTargetSymlink(project))) continue;
    console.log(`Mounting ramdisk for ${project}`);
    await $`cargo ramdisk mount`.cwd(project);
    processedProjects.push(project);
  }

  console.log(`Processed ${processedProjects.length} project(s):`);
  for (const project of processedProjects) {
    console.log(`- ${project}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
