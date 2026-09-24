#!/usr/bin/env bun
/**
 * niri screenshot helper.
 *
 * niri-screenshot screenshot [-s|--screen] [-w|--window] [-a|--annotate]
 *   Take a screenshot via niri (default: interactive UI). With --annotate,
 *   wait for niri to write the file (async; the UI only writes on confirm),
 *   then open it in satty. Exits quietly if no file appears within 120s.
 *
 * niri-screenshot annotate
 *   Open the newest screenshot in satty.
 */

import { $ } from "bun";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { home } from "../lib/env.js";

const dir = join(home(), "Pictures", "Screenshots");

async function newestPng(sinceMs = 0) {
  let best = null;
  let bestMtime = sinceMs;
  for (const name of await readdir(dir)) {
    if (!name.endsWith(".png")) continue;
    const path = join(dir, name);
    const { mtimeMs } = await stat(path);
    if (mtimeMs > bestMtime) {
      bestMtime = mtimeMs;
      best = path;
    }
  }
  return best;
}

async function annotateFile(path) {
  if (!Bun.which("satty")) {
    await $`notify-send satty "satty is not installed"`.quiet().nothrow();
    console.error("niri-screenshot: satty is not installed");
    process.exit(1);
  }
  await $`satty --filename ${path} --output-filename ${path} --fullscreen`;
}

async function cmdAnnotate() {
  const latest = await newestPng();
  if (!latest) {
    await $`notify-send satty ${`No screenshots found in ${dir}`}`.quiet().nothrow();
    process.exit(1);
  }
  await annotateFile(latest);
}

async function cmdScreenshot(args) {
  let action = "screenshot";
  let annotate = false;
  for (const arg of args) {
    switch (arg) {
      case "-s":
      case "--screen":
      case "-w":
      case "--window":
        if (action !== "screenshot") usage("-s/--screen and -w/--window are mutually exclusive");
        action = arg === "-s" || arg === "--screen" ? "screenshot-screen" : "screenshot-window";
        break;
      case "-a":
      case "--annotate":
        annotate = true;
        break;
      default:
        usage(`unknown option: ${arg}`);
    }
  }

  const start = Date.now();
  await $`niri msg action ${action}`;
  if (!annotate) return;

  const deadline = start + 120_000;
  let file = null;
  while (Date.now() < deadline) {
    file = await newestPng(start);
    if (file) break;
    await Bun.sleep(200);
  }
  if (!file) return;
  await annotateFile(file);
}

function usage(error) {
  if (error) console.error(`niri-screenshot: ${error}`);
  console.error("usage: niri-screenshot screenshot [-s|--screen] [-w|--window] [-a|--annotate] | annotate");
  process.exit(2);
}

const [sub, ...rest] = process.argv.slice(2);
if (sub === "screenshot") await cmdScreenshot(rest);
else if (sub === "annotate") await cmdAnnotate();
else usage();
