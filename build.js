#!/usr/bin/env bun
/**
 * Compile each direct .js in src/ (and ../private/src/) to a standalone executable in dist/,
 * src/mise-tasks/ to dist/mise-tasks/, and src/niri-scripts/ to dist/ on Linux.
 * Run: bun run build
 * Skips a target that is newer than its entry and every shared input (build.js, package.json,
 * bun.lock, src/lib/**), and removes outputs whose source no longer exists.
 */
import { Glob } from "bun";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
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

/** A running process locks its .exe on Windows, but renaming it away still works. */
function moveAsideLockedOutputs(outfile) {
  if (process.platform !== "win32") return false;
  let moved = false;
  for (const path of [outfile, outfile + ".exe"]) {
    if (!existsSync(path)) continue;
    try {
      renameSync(path, `${path}.old-${process.pid}`);
      moved = true;
    } catch {}
  }
  return moved;
}

/** Removes outputs moved aside by moveAsideLockedOutputs; they may still be locked by the running process. */
function cleanOldOutputs(outDir) {
  if (!existsSync(outDir)) return;
  for (const file of readdirSync(outDir, { withFileTypes: true })) {
    if (!file.isFile() || !/\.old-\d+$/.test(file.name)) continue;
    try {
      rmSync(join(outDir, file.name));
    } catch {}
  }
}

async function tryBuild({ sourcePath, outfile }) {
  try {
    const result = await Bun.build({
      entrypoints: [sourcePath],
      minify: true,
      compile: { outfile, autoloadDotenv: false, autoloadBunfig: false },
    });
    return result.success ? { result } : { error: result.logs };
  } catch (err) {
    return { error: err.message };
  }
}

async function buildOne({ sourcePath, outfile }) {
  let { result, error } = await tryBuild({ sourcePath, outfile });
  if (!result && moveAsideLockedOutputs(outfile)) {
    ({ result, error } = await tryBuild({ sourcePath, outfile }));
  }
  if (!result) {
    console.error(error);
    throw new Error(`Build failed: ${sourcePath}`);
  }
  return result.outputs[0].path;
}

async function buildIfStale(entries, outDir, sharedMtime, failures) {
  mkdirSync(outDir, { recursive: true });
  cleanOldOutputs(outDir);
  for (const { name, sourcePath } of entries) {
    const outfile = join(outDir, name);
    const outMtime = outputMtime(outfile);
    if (outMtime > 0 && outMtime >= Math.max(sharedMtime, mtime(sourcePath))) {
      console.log(`Skipping ${sourcePath} (up to date)`);
      continue;
    }
    console.log(`Building ${sourcePath} -> ${outfile}`);
    try {
      const outPath = await buildOne({ sourcePath, outfile });
      console.log(`  -> ${outPath}`);
    } catch (err) {
      console.error(err.message);
      failures.push(sourcePath);
    }
  }
}

function pruneStale(entries, outDir) {
  if (!existsSync(outDir)) return;
  const names = new Set(entries.map((e) => e.name));
  for (const file of readdirSync(outDir, { withFileTypes: true })) {
    if (!file.isFile() || /\.old-\d+$/.test(file.name)) continue;
    if (names.has(file.name.replace(/\.exe$/, ""))) continue;
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
const failures = [];
await buildIfStale(binEntries, distDir, sharedMtime, failures);
if (process.platform === "linux") {
  await buildIfStale(niriEntries, distDir, sharedMtime, failures);
}
pruneStale([...binEntries, ...niriEntries], distDir);

const miseTasksDistDir = join(distDir, "mise-tasks");
const miseEntries = await scanEntries(join(root, "src", "mise-tasks"));
await buildIfStale(miseEntries, miseTasksDistDir, sharedMtime, failures);
pruneStale(miseEntries, miseTasksDistDir);

if (failures.length > 0) {
  console.error(`Build failed for ${failures.length} file(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("Build done.");
