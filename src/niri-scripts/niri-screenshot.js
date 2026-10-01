#!/usr/bin/env bun
/**
 * niri screenshot helper.
 *
 * niri-screenshot screenshot [-s|--screen] [-w|--window] [-a|--annotate]
 *   Take a screenshot via niri (default: interactive UI). With --annotate,
 *   wait for niri's ScreenshotCaptured event and open the image in satty.
 *   niri also copies the shot to the clipboard; that cliphist entry is removed
 *   when satty copies, so history keeps only the annotated image. Satty's own
 *   clipboard offer is not pasteable in Electron clients (ChatGPT desktop)
 *   until something re-offers it, so copy is handed to wl-copy. Ctrl+S saves
 *   via satty's output-filename. Exits quietly if nothing arrives within 120s.
 *
 * niri-screenshot annotate
 *   Open the newest screenshot in satty.
 *
 * niri-screenshot --copy-png [cliphist-id...]
 *   satty's copy command: re-offer the PNG on stdin with wl-copy, then delete
 *   the given cliphist entries.
 */

import { $ } from "bun";
import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { home } from "../lib/env.js";

const dir = join(home(), "Pictures", "Screenshots");
const runtimeDir = process.env.XDG_RUNTIME_DIR || tmpdir();
const captureOwner = join(runtimeDir, "niri-screenshot-owner");
const captureTimeoutMs = 120_000;
const clipboardTimeoutMs = 3_000;
const cliphistDeleteTimeoutMs = 1_000;
const wlCopyTimeoutMs = 10_000;
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_HISTORY = /\[\[\s?binary.*\bpng\b/i;

async function fail(msg) {
  await $`notify-send satty ${msg}`.quiet().nothrow();
  const err = new Error(msg);
  err.exitCode = 1;
  throw err;
}

async function poll(check, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await Bun.sleep(50);
  }
  return null;
}

function shQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

// satty runs the copy command through sh. Compiled binaries run from bunfs and
// re-exec themselves; source runs pass the script back to bun.
function selfCommand(args) {
  const self = Bun.main.startsWith("/$bunfs/") ? [process.execPath] : [process.execPath, Bun.main];
  return [...self, ...args].map(shQuote).join(" ");
}

async function clipboardHasPng() {
  const r = await $`wl-paste --list-types`.quiet().nothrow();
  return r.exitCode === 0 && r.stdout.toString().split("\n").includes("image/png");
}

async function pasteClipboardPng() {
  if (!Bun.which("wl-paste") || !(await poll(clipboardHasPng, clipboardTimeoutMs))) {
    await fail("No image on the clipboard");
  }
  return (await $`wl-paste --type image/png`.quiet()).stdout;
}

async function copyPng(png) {
  const proc = Bun.spawn(["wl-copy", "--type", "image/png"], {
    stdin: new Response(png),
    stdout: "ignore",
    stderr: "ignore",
    timeout: wlCopyTimeoutMs,
  });
  const code = await proc.exited;
  if (proc.signalCode) throw new Error(`wl-copy was killed by ${proc.signalCode}`);
  if (code !== 0) throw new Error(`wl-copy failed with exit code ${code}`);
}

async function cliphistPngIds() {
  if (!Bun.which("cliphist")) return [];
  const r = await $`cliphist list`.quiet().nothrow();
  if (r.exitCode !== 0) return [];
  return r.stdout
    .toString()
    .split("\n")
    .filter((line) => PNG_HISTORY.test(line))
    .map((line) => line.split("\t")[0]);
}

async function waitForNewPngIds(before) {
  if (!Bun.which("cliphist")) return [];
  const fresh = await poll(async () => {
    const ids = (await cliphistPngIds()).filter((id) => !before.has(id));
    return ids.length ? ids : null;
  }, clipboardTimeoutMs);
  return fresh ?? [];
}

async function deleteCliphistIds(ids) {
  if (!ids.length || !Bun.which("cliphist")) return;
  const payload = ids.map((id) => `${id}\n`).join("");
  await poll(async () => {
    // A string stdin is rejected, and a Buffer is dropped when stdout is ignored.
    const proc = Bun.spawn(["cliphist", "delete"], {
      stdin: new Response(payload),
      stdout: "ignore",
      stderr: "ignore",
    });
    return (await proc.exited) === 0;
  }, cliphistDeleteTimeoutMs);
}

// satty writes the PNG to the copy command's stdin and waits for it to exit
// without closing that pipe. wl-copy would block on EOF and freeze the UI, so
// stop at IEND and re-offer the bytes with wl-copy (the offer Electron pastes).
async function readPng(stream) {
  let buf = Buffer.alloc(1 << 20);
  let size = 0;
  let chunkAt = PNG_SIG.length;
  for await (const data of stream) {
    if (size + data.length > buf.length) {
      const grown = Buffer.alloc(Math.max(buf.length * 2, size + data.length));
      buf.copy(grown, 0, 0, size);
      buf = grown;
    }
    buf.set(data, size);
    size += data.length;
    if (size < PNG_SIG.length) continue;
    if (!PNG_SIG.equals(buf.subarray(0, PNG_SIG.length))) throw new Error("stdin is not a png");
    // Chunk layout: length (4) + type (4) + data (length) + crc (4).
    while (chunkAt + 8 <= size) {
      const end = chunkAt + 12 + buf.readUInt32BE(chunkAt);
      if (buf.toString("latin1", chunkAt + 4, chunkAt + 8) === "IEND") {
        if (end <= size) return buf.subarray(0, end);
        break;
      }
      chunkAt = end;
    }
  }
  throw new Error("truncated png on stdin");
}

async function openSatty(filename, { outputFilename, niriIds = [] } = {}) {
  if (!Bun.which("satty")) await fail("satty is not installed");
  const args = ["--filename", filename, "--fullscreen", "--copy-command", selfCommand(["--copy-png", ...niriIds])];
  if (outputFilename) args.push("--output-filename", outputFilename);
  await $`satty ${args}`;
}

async function* jsonLines(stream) {
  let partial = "";
  for await (const text of stream.pipeThrough(new TextDecoderStream())) {
    const lines = (partial + text).split("\n");
    partial = lines.pop();
    for (const line of lines) {
      let value;
      try {
        value = JSON.parse(line);
      } catch {
        continue;
      }
      yield value;
    }
  }
}

// Every instance sees every ScreenshotCaptured event, and one whose UI was
// cancelled or replaced keeps waiting, so only the latest invocation may act.
async function claimCapture() {
  await writeFile(captureOwner, String(process.pid));
}

async function ownsCapture() {
  return (await readFile(captureOwner, "utf8").catch(() => "")) === String(process.pid);
}

/** @returns {Promise<{ path: string | null } | null>} null when nothing is captured in time */
async function capture(action, path) {
  const proc = Bun.spawn(["niri", "msg", "-j", "event-stream"], {
    stdout: "pipe",
    stderr: "ignore",
    timeout: captureTimeoutMs,
  });
  const events = jsonLines(proc.stdout);
  try {
    // niri sends its current state on connect; once that arrives the stream is
    // live and the capture event can't be missed.
    await events.next();
    // Explicit --path so Enter writes a file satty can open. niri still copies
    // to the clipboard; Ctrl+C in the UI skips the file and we read that copy.
    await $`niri msg action ${[action, "--path", path]}`;
    for await (const event of events) {
      if (event.ScreenshotCaptured) return (await ownsCapture()) ? event.ScreenshotCaptured : null;
    }
    return null;
  } finally {
    proc.kill();
    await events.return();
    await proc.exited;
  }
}

async function screenshotAndAnnotate(action) {
  const shot = join(runtimeDir, `niri-screenshot-${process.pid}.png`);
  try {
    const before = new Set(await cliphistPngIds());
    const captured = await capture(action, shot);
    if (!captured) return;
    if (!captured.path) await writeFile(shot, await pasteClipboardPng());
    await openSatty(captured.path ?? shot, { niriIds: await waitForNewPngIds(before) });
  } finally {
    await rm(shot, { force: true });
  }
}

async function newestPng() {
  let newest = null;
  let newestMtime = 0;
  for (const name of await readdir(dir).catch(() => [])) {
    if (!name.endsWith(".png")) continue;
    const path = join(dir, name);
    const { mtimeMs } = await stat(path);
    if (mtimeMs > newestMtime) {
      newestMtime = mtimeMs;
      newest = path;
    }
  }
  return newest;
}

async function cmdAnnotate() {
  const latest = await newestPng();
  if (!latest) await fail(`No screenshots found in ${dir}`);
  await openSatty(latest, { outputFilename: latest });
}

async function cmdCopyPng(niriIds) {
  if (!Bun.which("wl-copy")) await fail("wl-copy is not installed");
  await copyPng(await readPng(Bun.stdin.stream()));
  await deleteCliphistIds(niriIds);
}

function parseScreenshotArgs(args) {
  try {
    return parseArgs({
      args,
      options: {
        screen: { type: "boolean", short: "s" },
        window: { type: "boolean", short: "w" },
        annotate: { type: "boolean", short: "a" },
      },
    }).values;
  } catch (err) {
    usage(err.message);
  }
}

async function cmdScreenshot(args) {
  const opts = parseScreenshotArgs(args);
  if (opts.screen && opts.window) usage("-s/--screen and -w/--window are mutually exclusive");
  let action = "screenshot";
  if (opts.screen) action = "screenshot-screen";
  if (opts.window) action = "screenshot-window";
  await claimCapture();
  if (opts.annotate) await screenshotAndAnnotate(action);
  else await $`niri msg action ${action}`;
}

function usage(error) {
  if (error) console.error(`niri-screenshot: ${error}`);
  console.error("usage: niri-screenshot screenshot [-s|--screen] [-w|--window] [-a|--annotate] | annotate");
  process.exit(2);
}

try {
  const [sub, ...rest] = process.argv.slice(2);
  if (sub === "--copy-png") await cmdCopyPng(rest);
  else if (sub === "screenshot") await cmdScreenshot(rest);
  else if (sub === "annotate") await cmdAnnotate();
  else usage();
} catch (err) {
  console.error(`niri-screenshot: ${err.message}`);
  process.exit(err.exitCode ?? 1);
}
