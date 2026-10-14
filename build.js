#!/usr/bin/env bun
/**
 * Compile each direct .js in src/ (and ../private/src/) to a standalone executable in dist/,
 * src/mise-tasks/ to dist/mise-tasks/, and src/niri-scripts/ to dist/ on Linux.
 * Run: bun run build
 * Skips a target that is newer than its entry and every shared input (build.js, package.json,
 * bun.lock, src/lib/**), and removes outputs whose source no longer exists.
 */
import { Glob } from "bun";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const root = import.meta.dir;
const distDir = join(root, "dist");
const glob = new Glob("*.js");

async function scanEntries(srcDir) {
  const entries = [];
  if (!existsSync(srcDir)) return entries;
  for await (const file of glob.scan(srcDir)) {
    entries.push({ name: file.slice(0, -3), sourcePath: join(srcDir, file) });
  }
  return entries;
}

function mtime(path) {
  try {
    const st = statSync(path);
    return st.isFile() ? st.mtimeMs : 0;
  } catch {
    return 0;
  }
}

function sharedInputMtime() {
  const files = [import.meta.path, join(root, "package.json"), join(root, "bun.lock")];
  for (const libDir of [join(root, "src", "lib"), join(root, "..", "private", "src", "lib")]) {
    if (!existsSync(libDir)) continue;
    for (const f of readdirSync(libDir, { recursive: true })) files.push(join(libDir, f));
  }
  return Math.max(...files.map(mtime));
}

/** Handles the .exe suffix Bun adds on Windows. */
function outputMtime(outfile) {
  return Math.max(mtime(outfile), mtime(outfile + ".exe"));
}

async function buildOne({ sourcePath, outfile }) {
  const result = await Bun.build({
    entrypoints: [sourcePath],
    minify: true,
    compile: { outfile, autoloadDotenv: false, autoloadBunfig: false },
  });
  if (!result.success) {
    console.error(result.logs);
    process.exit(1);
  }
  return result.outputs[0].path;
}

async function buildIfStale(entries, outDir, sharedMtime) {
  mkdirSync(outDir, { recursive: true });
  for (const { name, sourcePath } of entries) {
    const outfile = join(outDir, name);
    const outMtime = outputMtime(outfile);
    if (outMtime > 0 && outMtime >= Math.max(sharedMtime, mtime(sourcePath))) {
      console.log(`Skipping ${sourcePath} (up to date)`);
      continue;
    }
    console.log(`Building ${sourcePath} -> ${outfile}`);
    const outPath = await buildOne({ sourcePath, outfile });
    console.log(`  -> ${outPath}`);
  }
}

function pruneStale(entries, outDir) {
  if (!existsSync(outDir)) return;
  const names = new Set(entries.map((e) => e.name));
  for (const file of readdirSync(outDir, { withFileTypes: true })) {
    if (!file.isFile() || names.has(file.name.replace(/\.exe$/, ""))) continue;
    const path = join(outDir, file.name);
    try {
      rmSync(path);
      console.log(`Removed ${path} (source no longer exists)`);
    } catch (err) {
      console.warn(`Could not remove stale ${path}: ${err.message}`);
    }
  }
}

const sharedMtime = sharedInputMtime();

const binEntries = [
  ...(await scanEntries(join(root, "src"))),
  ...(await scanEntries(join(root, "..", "private", "src"))),
];
const niriEntries = await scanEntries(join(root, "src", "niri-scripts"));
await buildIfStale(binEntries, distDir, sharedMtime);
if (process.platform === "linux") {
  await buildIfStale(niriEntries, distDir, sharedMtime);
}
pruneStale([...binEntries, ...niriEntries], distDir);

const miseTasksDistDir = join(distDir, "mise-tasks");
const miseEntries = await scanEntries(join(root, "src", "mise-tasks"));
await buildIfStale(miseEntries, miseTasksDistDir, sharedMtime);
pruneStale(miseEntries, miseTasksDistDir);

console.log("Build done.");
