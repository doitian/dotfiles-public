#!/usr/bin/env bun
import { readdir, lstat, readlink, writeFile } from "node:fs/promises";
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

async function targetPointsToRamdisk(project) {
  const target = join(project, "target");
  try {
    const targetStat = await lstat(target);
    if (!targetStat.isSymbolicLink()) return false;
    const link = await readlink(target);
    return link.startsWith("/dev/shm/");
  } catch (err) {
    if (err?.code === "ENOENT") return false;
    throw err;
  }
}

async function main() {
  const processedProjects = [];

  for (const project of await projects()) {
    if (!(await targetPointsToRamdisk(project))) continue;
    console.log(`Unmounting ramdisk for ${project}`);
    await $`cargo ramdisk unmount -c`.cwd(project);
    await writeFile(join(project, TARGET_SHM_FLAG), "");
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
