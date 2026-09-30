#!/usr/bin/env bun
/**
 * hyprwhspr-patch-ctx – patch hyprwhspr's qwen3-asr backend to pass --ctx-size
 * to llama-server, shrinking the f16 KV cache (~112 KiB/token; default 32000
 * ctx ≈ 3.5 GiB VRAM on top of ~2.5 GiB weights).
 *
 * The patched backend reads the value from ~/.config/hyprwhspr/config.json
 * (key: qwen3_asr_ctx_size), so it stays tunable without re-patching.
 *
 * Usage:
 *   hyprwhspr-patch-ctx [ctxSize]     patch; ctxSize is the fallback default (8192)
 *   hyprwhspr-patch-ctx --restore     restore the original backend file
 *   hyprwhspr-patch-ctx --status      show patch state
 *   hyprwhspr-patch-ctx --file PATH   operate on PATH instead of the system backend
 *
 * Idempotent; keeps a one-time backup at <backend>.orig (uses sudo only when
 * the target isn't writable by the current user).
 * Re-run after each hyprwhspr package upgrade (the patch is not preserved).
 */
import { parseArgs } from "node:util";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import { $ } from "bun";
import { exists } from "./lib/fs.js";

let BACKEND = "/usr/lib/hyprwhspr/lib/src/backends/qwen3_asr_backend.py";
let BACKUP = `${BACKEND}.orig`;
const ANCHOR = 'str(self.config.get_setting("threads", 4)), "--parallel", "1"]';
const DEFAULT_CTX = 8192;

async function writable(path) {
  try {
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function cp(src, dst) {
  // dst creation needs a writable directory, not a writable src
  if (await writable(dirname(dst))) await $`cp ${src} ${dst}`;
  else await $`sudo cp ${src} ${dst}`;
}

async function installPatched(content) {
  if (await writable(BACKEND)) {
    await Bun.write(BACKEND, content);
    return;
  }
  const tmp = (await $`mktemp`.text()).trim();
  await Bun.write(tmp, content);
  await $`sudo install -m 644 ${tmp} ${BACKEND}`;
  await $`rm -f ${tmp}`;
}

async function readBackend() {
  return await Bun.file(BACKEND).text();
}

async function patchState(content) {
  const m = content.match(/qwen3_asr_ctx_size",\s*(\d+)/);
  if (m) return { patched: true, ctx: Number(m[1]) };
  return { patched: false, hasAnchor: content.includes(ANCHOR) };
}

async function restore() {
  if (!(await exists(BACKUP))) {
    console.error(`No backup found at ${BACKUP}`);
    process.exit(1);
  }
  await cp(BACKUP, BACKEND);
  console.log("Restored original backend. Restart hyprwhspr: systemctl --user restart hyprwhspr");
}

async function status() {
  const state = await patchState(await readBackend());
  if (state.patched) console.log(`Patched: qwen3_asr_ctx_size default ${state.ctx}`);
  else console.log(state.hasAnchor ? "Not patched" : "Not patched (anchor not found — upstream changed?)");
  console.log(`Backup: ${(await exists(BACKUP)) ? BACKUP : "none"}`);
}

async function patch(ctxSize) {
  const state = await patchState(await readBackend());

  if (state.patched) {
    if (state.ctx === ctxSize) {
      console.log(`Already patched with qwen3_asr_ctx_size default ${state.ctx}`);
      return;
    }
    console.error(`Already patched with default ${state.ctx}. Run --restore first, then re-patch.`);
    process.exit(1);
  }
  if (!state.hasAnchor) {
    console.error("Patch anchor not found in backend file — hyprwhspr upstream changed the llama-server args.");
    console.error(`Expected: ${ANCHOR}`);
    process.exit(1);
  }

  const content = await readBackend();
  const patched = content.replace(
    ANCHOR,
    `str(self.config.get_setting("threads", 4)), "--parallel", "1",\n                "--ctx-size", str(int(self.config.get_setting("qwen3_asr_ctx_size", ${ctxSize})))]`,
  );

  if (!(await exists(BACKUP))) {
    await cp(BACKEND, BACKUP);
    console.log(`Backup written: ${BACKUP}`);
  }
  await installPatched(patched);

  // ast.parse, not py_compile: py_compile writes bytecode to a root-owned
  // __pycache__ next to the backend and fails with EACCES as a non-root user.
  const check = await $`python3 -c 'import ast,sys; ast.parse(open(sys.argv[1]).read())' ${BACKEND}`
    .quiet()
    .nothrow();
  if (check.exitCode !== 0) {
    console.error("Patched file fails python syntax check — restoring backup.");
    await cp(BACKUP, BACKEND);
    process.exit(1);
  }

  console.log(`Patched ${BACKEND}`);
  console.log(`KV cache ~${Math.round((ctxSize * 114688) / 1024 / 1024)} MiB at the ${ctxSize} default (was ~3500 MiB at 32000 ctx).`);
  console.log(`Tune via "qwen3_asr_ctx_size" in ~/.config/hyprwhspr/config.json — no re-patch needed.`);
  console.log("Restart hyprwhspr: systemctl --user restart hyprwhspr");
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      restore: { type: "boolean" },
      status: { type: "boolean" },
      file: { type: "string" },
    },
  });

  if (values.file) {
    BACKEND = values.file;
    BACKUP = `${BACKEND}.orig`;
  }

  if (!(await exists(BACKEND))) {
    console.error(`Backend file not found: ${BACKEND}`);
    process.exit(1);
  }

  if (values.restore) return await restore();
  if (values.status) return await status();

  const ctxSize = positionals.length > 0 ? Number(positionals[0]) : DEFAULT_CTX;
  if (!Number.isInteger(ctxSize) || ctxSize < 512 || ctxSize > 65536) {
    console.error(`ctxSize must be an integer in [512, 65536], got: ${positionals[0]}`);
    process.exit(1);
  }

  await patch(ctxSize);
}

await main();
