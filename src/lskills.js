#!/usr/bin/env bun
import { lstat, mkdir, readdir, symlink, unlink } from "node:fs/promises";
import { join } from "node:path";
import { home } from "./lib/env.js";
import { exists } from "./lib/fs.js";

const SKILLS_SRC = join(home(), ".dotfiles/repos/public/ai/local-skills");

async function linkSkill(name) {
  const target = join(SKILLS_SRC, name);
  const parents = [join(home(), ".agents"), join(home(), ".claude")];
  const existing = [];
  for (const parent of parents) {
    if (await exists(parent)) existing.push(parent);
  }
  const dirs = existing.length > 0
    ? existing.map((parent) => join(parent, "skills"))
    : [join(home(), ".agents", "skills")];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
    const link = join(dir, name);
    const stat = await lstat(link).catch(() => null);
    if (stat) {
      if (!stat.isSymbolicLink()) {
        console.error(`lskills: ${link} exists and is not a symlink`);
        process.exit(1);
      }
      await unlink(link);
    }
    await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
    console.log(`linked ${link} -> ${target}`);
  }
}

async function ladd() {
  const entries = await readdir(SKILLS_SRC, { withFileTypes: true });
  const skills = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (skills.length === 0) {
    console.error(`lskills: no skills found in ${SKILLS_SRC}`);
    process.exit(1);
  }

  const fzf = Bun.spawn(["fzf", "--no-multi"], {
    stdin: new Blob([skills.join("\n") + "\n"]),
    stdout: "pipe",
    stderr: "inherit",
  });
  const selected = (await new Response(fzf.stdout).text()).trim();
  const code = await fzf.exited;
  if (code !== 0) process.exit(code);
  if (!selected) process.exit(1);

  await linkSkill(selected);
}

async function main() {
  await ladd();
}

main().catch((error) => {
  console.error(`lskills: ${error.message}`);
  process.exit(1);
});
