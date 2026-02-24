#!/usr/bin/env bun
/**
 * Sync snippet dirs (junctions) and merge private snippets. Port of sync-snippets.ps1
 */
import {
  cp,
  rm,
  mkdir,
  readdir,
  readFile,
  writeFile,
  symlink,
  lstat,
  stat,
} from "node:fs/promises";
import { join } from "node:path";
import { exists } from "./lib/fs.js";
import { home } from "./lib/env.js";

const isWin = process.platform === "win32";

const SCOOP = process.env.SCOOP || join(home(), "scoop");
const REPOS = join(home(), ".dotfiles", "repos");
const PUBLIC_REPO = join(REPOS, "public");
const PRIVATE_REPO = join(REPOS, "private");

const snippetsDirs = isWin
  ? [
    join(SCOOP, "persist", "vscode", "data", "user-data", "User", "snippets"),
    join(SCOOP, "persist", "cursor", "data", "user-data", "User", "snippets"),
    join(home(), "AppData", "Roaming", "Cursor", "User", "snippets"),
  ]
  : [
    join(home(), ".config", "Code", "User", "snippets"),
    join(home(), ".config", "Cursor", "User", "snippets"),
  ];
const targetSnippets = join(PUBLIC_REPO, "nvim", "snippets");
const globalSnippets = join(targetSnippets, "global.code-snippets");
const allJson = join(targetSnippets, "all.json");
const privateSnippetsDir = join(PRIVATE_REPO, "nvim", "snippets");
const privateOut = join(targetSnippets, "private-snippets.code-snippets");

async function isJunction(p) {
  try {
    const s = await lstat(p);
    return s.isSymbolicLink?.() ?? false;
  } catch {
    return false;
  }
}

async function createLink(linkPath, targetPath) {
  if (isWin) {
    const proc = Bun.spawn(
      ["cmd", "/c", "mklink", "/J", linkPath, targetPath],
      { stdin: "inherit", stdout: "inherit", stderr: "inherit" },
    );
    const code = await proc.exited;
    if (code !== 0) throw new Error(`mklink exited ${code}`);
  } else {
    await symlink(targetPath, linkPath, "dir");
  }
}

async function main() {
  await cp(globalSnippets, allJson, { force: true });

  for (const dir of snippetsDirs) {
    if (!(await exists(dir))) continue;
    try {
      const isLink = await isJunction(dir);
      if (!isLink) {
        await rm(dir, { recursive: true, force: true });
        await mkdir(join(dir, ".."), { recursive: true });
        await createLink(dir, targetSnippets);
      }
    } catch (e) {
      console.warn("Skip", dir, e.message);
    }
  }

  if (await exists(privateSnippetsDir)) {
    const names = await readdir(privateSnippetsDir);
    const merged = {};
    for (const name of names) {
      const f = join(privateSnippetsDir, name);
      const s = await stat(f);
      if (!s.isFile()) continue;
      const content = await readFile(f, "utf8");
      try {
        Object.assign(merged, JSON.parse(content));
      } catch (_) { }
    }
    await writeFile(privateOut, JSON.stringify(merged, null, 2), "utf8");
  }
}

main();
