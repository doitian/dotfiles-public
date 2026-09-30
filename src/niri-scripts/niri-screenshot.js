#!/usr/bin/env bun
/**
 * niri screenshot helper.
 *
 * niri-screenshot screenshot [-s|--screen] [-w|--window] [-a|--annotate]
 *   Take a screenshot via niri (default: interactive UI). With --annotate,
 *   wait for niri's ScreenshotCaptured event, then open the result in satty:
 *   the file niri saved on disk, or the clipboard image when niri didn't
 *   write one. The niri config sets screenshot-path null, so normally satty
 *   opens the clipboard and its Ctrl+S saves the file. Exits quietly if
 *   nothing arrives within 120s.
 *
 * niri-screenshot annotate
 *   Open the newest screenshot in satty.
 */

import { $ } from "bun";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { home } from "../lib/env.js";

const dir = join(home(), "Pictures", "Screenshots");
const captureTimeoutMs = 120_000;
const clipboardTimeoutMs = 3_000;

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

async function requireSatty() {
  if (Bun.which("satty")) return;
  await $`notify-send satty "satty is not installed"`.quiet().nothrow();
  console.error("niri-screenshot: satty is not installed");
  process.exit(1);
}

async function notifyNoImage() {
  await $`notify-send satty "No image on the clipboard"`.quiet().nothrow();
  console.error("niri-screenshot: no image on the clipboard");
  process.exit(1);
}

async function annotateFile(path) {
  await requireSatty();
  await $`satty --filename ${path} --output-filename ${path} --fullscreen`;
}

async function clipboardHasPng() {
  const r = await $`wl-paste --list-types`.quiet().nothrow();
  return r.exitCode === 0 && r.stdout.toString().split("\n").includes("image/png");
}

async function waitForClipboardPng() {
  const deadline = Date.now() + clipboardTimeoutMs;
  while (Date.now() < deadline) {
    if (await clipboardHasPng()) return true;
    await Bun.sleep(50);
  }
  return false;
}

async function annotateClipboard() {
  await requireSatty();
  if (!Bun.which("wl-paste") || !(await waitForClipboardPng())) notifyNoImage();
  // satty reads the image from stdin; its configured output-filename saves
  // without a file chooser.
  await $`wl-paste --type image/png | satty --filename - --fullscreen`;
}

function createLineReader(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  return {
    async nextLine(timeoutMs) {
      const deadline = Date.now() + timeoutMs;
      while (true) {
        const newline = buffered.indexOf("\n");
        if (newline !== -1) {
          const line = buffered.slice(0, newline);
          buffered = buffered.slice(newline + 1);
          return line;
        }
        const remaining = deadline - Date.now();
        if (remaining <= 0) return null;
        const chunk = await Promise.race([
          reader.read(),
          Bun.sleep(remaining).then(() => null),
        ]);
        if (!chunk || chunk.done) return null;
        buffered += decoder.decode(chunk.value, { stream: true });
      }
    },
  };
}

/** @returns {Promise<string | null | undefined>} path, clipboard-only, cancelled */
async function waitForCaptured(lines) {
  const deadline = Date.now() + captureTimeoutMs;
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return undefined;
    const line = await lines.nextLine(remaining);
    if (line === null) return undefined;
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.ScreenshotCaptured) return event.ScreenshotCaptured.path ?? null;
  }
}

async function screenshotAndAnnotate(action, args) {
  const proc = Bun.spawn(["niri", "msg", "-j", "event-stream"], {
    stdout: "pipe",
    stderr: "ignore",
  });
  try {
    const lines = createLineReader(proc.stdout);
    await lines.nextLine(5_000);
    await $`niri msg action ${[action, ...args]}`;
    const path = await waitForCaptured(lines);
    if (path === undefined) return;
    if (path) await annotateFile(path);
    else await annotateClipboard();
  } finally {
    proc.kill();
  }
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

  if (!annotate) {
    await $`niri msg action ${action}`;
    return;
  }

  // The interactive UI picks its own mode (Enter saves, Ctrl+C copies only),
  // so only explicit screen/window shots force clipboard-only.
  const extra = action === "screenshot" ? [] : ["--write-to-disk", "false"];
  await screenshotAndAnnotate(action, extra);
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
