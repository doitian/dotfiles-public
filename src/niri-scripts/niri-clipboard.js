#!/usr/bin/env bun
/**
 * Clipboard history picker (Mod+V): cliphist history in rofi script mode.
 * Text rows show cliphist's preview; image rows are decoded to files under
 * $TMPDIR/cliphist and shown as thumbnails in tall rows (rofi/clipboard.rasi).
 * Enter copies the entry, Ctrl+Enter also pastes it into the focused window,
 * Ctrl+Shift+Enter pastes it as plain text (HTML stripped, text/plain only).
 * Paste keys are sent by the launcher once rofi has closed, when focus is back
 * on the target window.
 * `niri-clipboard` starts rofi; rofi re-runs it with ROFI_RETV set and the
 * selection as argument.
 */

import { $ } from "bun";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pasteFocused } from "../lib/niri.js";

// Match cliphist's binary preview: "[[ binary data 24 KiB png 800x600 ]]"
const IMAGE_PREVIEW = /\[\[\s?binary.*?\b(gif|jpe?g|png|bmp|tiff|webp)\b/i;
const ICON_DIR = join(tmpdir(), "cliphist");
const PASTE_DELAY_MS = 300;
const HTML_TAG = /<\/?[a-z][^>]*>/i;
// rofi reports kb-custom-N as ROFI_RETV 10 + (N - 1), so the Ctrl+Enter /
// Ctrl+Shift+Enter bindings below (kb-custom-2/kb-custom-3) arrive as 11/12.
const RETV_COPY = "1";
const RETV_PASTE = "11";
const RETV_PASTE_PLAIN = "12";

async function fail(msg) {
  console.error(`niri-clipboard: ${msg}`);
  if (Bun.which("notify-send")) {
    await $`notify-send niri-clipboard ${msg}`.quiet().nothrow();
  }
  process.exit(1);
}

/**
 * Copy data to the clipboard. wl-copy forks a server that serves the selection
 * after the parent exits, so stdio is ignored: Bun shell would wait for its
 * inherited pipes to close.
 */
async function copyToClipboard(data, args = []) {
  const proc = Bun.spawn(["wl-copy", ...args], {
    stdin: data,
    stdout: "ignore",
    stderr: "ignore",
  });
  let timer;
  const code = await Promise.race([
    proc.exited,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve("timeout"), 10_000);
    }),
  ]);
  clearTimeout(timer);
  if (code === "timeout") {
    proc.kill();
    await fail("wl-copy did not exit");
  }
  if (code !== 0) {
    await fail(`wl-copy failed with exit code ${code}`);
  }
}

async function copy(selection) {
  const id = selection.split("\t")[0];
  if (!/^\d+$/.test(id)) {
    await fail(`invalid selection: ${selection}`);
  }
  const decoded = await $`cliphist decode ${id}`.quiet().nothrow();
  if (decoded.exitCode !== 0) {
    await fail(`cliphist decode ${id} failed: ${decoded.stderr.toString().trim()}`);
  }
  await copyToClipboard(decoded.stdout);
}

/** Convert clipboard HTML (browser copies) to text; plain text passes through. */
function toPlainText(text) {
  if (!HTML_TAG.test(text)) return text;
  return text
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|pre|table)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Hand the action to the launcher: it runs after rofi closes, when focus is back. */
async function queue(action, selection) {
  const [id, preview = ""] = selection.split("\t");
  if (!/^\d+$/.test(id)) {
    await fail(`invalid selection: ${selection}`);
  }
  if (action === "plain" && IMAGE_PREVIEW.test(preview)) {
    await fail("paste as plain text works only for text entries");
  }
  const pending = process.env.NIRI_CLIPBOARD_PENDING;
  if (!pending) {
    await fail("NIRI_CLIPBOARD_PENDING is not set");
  }
  await Bun.write(pending, JSON.stringify({ action, id }));
}

async function list() {
  process.stdout.write(
    "\0prompt\x1fClipboard\n\0no-custom\x1ftrue\n\0use-hot-keys\x1ftrue\n"
    + "\0message\x1fEnter: copy · Ctrl+Enter: paste · Ctrl+Shift+Enter: paste plain\n",
  );

  const result = await $`cliphist list`.quiet().nothrow();
  if (result.exitCode !== 0) {
    const err = result.stderr.toString().trim();
    // Empty store, not an error: cliphist refuses to open a missing db read-only
    if (!err.includes("please store something first")) {
      await fail(`cliphist list failed: ${err}`);
    }
    return;
  }

  await rm(ICON_DIR, { recursive: true, force: true });
  await mkdir(ICON_DIR, { recursive: true });

  const rows = [];
  for (const line of result.stdout.toString().split("\n").filter(Boolean)) {
    const id = line.split("\t")[0];
    const preview = line.slice(id.length + 1);
    // Browsers offer an HTML blob next to the copied text; hide it, as cliphist's rofi contrib does
    if (preview.startsWith("<meta http-equiv=")) continue;
    const format = preview.match(IMAGE_PREVIEW)?.[1];
    if (format) {
      const icon = join(ICON_DIR, `${id}.${format.toLowerCase()}`);
      const decoded = await $`cliphist decode ${id}`.quiet().nothrow();
      if (decoded.exitCode === 0) {
        await Bun.write(icon, decoded.stdout);
        rows.push(`${line}\0icon\x1f${icon}`);
        continue;
      }
    }
    rows.push(line);
  }

  for (const row of rows) {
    process.stdout.write(`${row}\n`);
  }
}

/** Run the action the picker queued, if any, after rofi has exited. */
async function runPending(pendingPath) {
  const pending = Bun.file(pendingPath);
  if (!(await pending.exists())) return;
  let action;
  try {
    action = await pending.json();
  } catch {
    return;
  } finally {
    await rm(pendingPath, { force: true });
  }
  const id = String(action.id ?? "");
  if (!/^\d+$/.test(id)) return;
  const decoded = await $`cliphist decode ${id}`.quiet().nothrow();
  if (decoded.exitCode !== 0) {
    await fail(`cliphist decode ${id} failed: ${decoded.stderr.toString().trim()}`);
  }
  if (action.action === "plain") {
    const text = Buffer.from(toPlainText(decoded.stdout.toString("utf8")));
    await copyToClipboard(text, ["--type", "text/plain"]);
  } else {
    await copyToClipboard(decoded.stdout);
  }
  // Let niri hand focus back to the target window before the keys go out
  await Bun.sleep(PASTE_DELAY_MS);
  const pasted = await pasteFocused();
  if (pasted.exitCode !== 0) {
    await fail(`ydotool failed: ${pasted.stderr.toString().trim()}`);
  }
}

if (process.env.ROFI_RETV !== undefined) {
  const selection = process.argv[2];
  const retv = process.env.ROFI_RETV;
  if (retv === RETV_COPY && selection !== undefined) {
    await copy(selection);
  } else if (retv === RETV_PASTE && selection !== undefined) {
    await queue("paste", selection);
  } else if (retv === RETV_PASTE_PLAIN && selection !== undefined) {
    await queue("plain", selection);
  } else {
    await list();
  }
} else if (!Bun.which("cliphist")) {
  await fail("cliphist not found");
} else if (!Bun.which("rofi")) {
  await fail("rofi not found");
} else {
  const pending = join(process.env.XDG_RUNTIME_DIR || tmpdir(), `niri-clipboard-${process.pid}.json`);
  // accept-custom owns Ctrl+Return by default and is inert under no-custom;
  // move it aside so the custom keys can take Ctrl+Enter/Ctrl+Shift+Enter
  const result = await $`rofi -show clipboard -modes ${"clipboard:niri-clipboard"} -show-icons -theme clipboard -kb-accept-custom ${"Control+Alt+Return"} -kb-accept-custom-alt ${"Control+Alt+Shift+Return"} -kb-custom-2 ${"Control+Return"} -kb-custom-3 ${"Control+Shift+Return"}`
    .env({ ...process.env, NIRI_CLIPBOARD_PENDING: pending })
    .quiet()
    .nothrow();
  await runPending(pending);
  await rm(ICON_DIR, { recursive: true, force: true });
  process.exit(result.exitCode ?? 0);
}