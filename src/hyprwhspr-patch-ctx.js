#!/usr/bin/env bun
/**
 * hyprwhspr-patch-ctx – patch hyprwhspr's qwen3-asr backend so llama-server
 * gets --ctx-size only when qwen3_asr_ctx_size is set in
 * ~/.config/hyprwhspr/config.json (unset = llama.cpp default of 32000 ctx,
 * an f16 KV cache of ~112 KiB/token ≈ 3.5 GiB VRAM on top of ~2.5 GiB weights).
 *
 * Usage:
 *   hyprwhspr-patch-ctx [ctxSize]     patch; also writes ctxSize to config.json if given
 *   hyprwhspr-patch-ctx --restore     restore the original backend file
 *   hyprwhspr-patch-ctx --status      show patch state and configured value
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
import { home } from "./lib/env.js";

let BACKEND = "/usr/lib/hyprwhspr/lib/src/backends/qwen3_asr_backend.py";
let BACKUP = `${BACKEND}.orig`;
const CONFIG = `${home()}/.config/hyprwhspr/config.json`;
const ANCHOR = 'str(self.config.get_setting("threads", 4)), "--parallel", "1"]';
const MARKER = "qwen3_asr_ctx_size";
const STYLE = 'if ctx_size is not None:';
const PATCHED = `str(self.config.get_setting("threads", 4)), "--parallel", "1"]
        ctx_size = self.config.get_setting("qwen3_asr_ctx_size", None)
        if ctx_size is not None:
            args += ["--ctx-size", str(max(512, min(65536, int(ctx_size))))]`;

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
  if (content.includes(STYLE)) return { patched: true };
  if (content.includes(MARKER)) return { patched: false, legacy: true };
  return { patched: false, hasAnchor: content.includes(ANCHOR) };
}

async function readConfig() {
  try {
    return JSON.parse(await Bun.file(CONFIG).text());
  } catch {
    return null;
  }
}

async function setConfigCtx(ctxSize) {
  const config = (await readConfig()) ?? {};
  config.qwen3_asr_ctx_size = ctxSize;
  await Bun.write(CONFIG, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Set "qwen3_asr_ctx_size": ${ctxSize} in ${CONFIG}`);
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
  if (state.patched) console.log("Patched (--ctx-size passed only when configured)");
  else if (state.legacy) console.log("Patched with an older version of this script (run --restore, then re-patch)");
  else console.log(state.hasAnchor ? "Not patched" : "Not patched (anchor not found — upstream changed?)");
  const config = await readConfig();
  const ctx = config?.qwen3_asr_ctx_size;
  console.log(`Config: ${ctx == null ? "qwen3_asr_ctx_size unset (llama.cpp default 32000)" : `qwen3_asr_ctx_size = ${ctx}`}`);
  console.log(`Backup: ${(await exists(BACKUP)) ? BACKUP : "none"}`);
}

async function patch(ctxSize) {
  const state = await patchState(await readBackend());

  if (!state.patched) {
    if (state.legacy) {
      console.error("Backend is patched with an older version of this script. Run --restore first, then re-patch.");
      process.exit(1);
    }
    if (!state.hasAnchor) {
      console.error("Patch anchor not found in backend file — hyprwhspr upstream changed the llama-server args.");
      console.error(`Expected: ${ANCHOR}`);
      process.exit(1);
    }

    const content = await readBackend();
    const patched = content.replace(ANCHOR, PATCHED);

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
  } else {
    console.log("Already patched");
  }

  if (ctxSize !== null) {
    await setConfigCtx(ctxSize);
    console.log(`KV cache ~${Math.round((ctxSize * 114688) / 1024 / 1024)} MiB at ${ctxSize} ctx (vs ~3500 MiB at the 32000 default).`);
  } else if ((await readConfig())?.qwen3_asr_ctx_size == null) {
    console.log('Note: qwen3_asr_ctx_size is unset — no --ctx-size will be passed. Run with a value, e.g. `hyprwhspr-patch-ctx 8192`.');
  }
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

  let ctxSize = null;
  if (positionals.length > 0) {
    ctxSize = Number(positionals[0]);
    if (!Number.isInteger(ctxSize) || ctxSize < 512 || ctxSize > 65536) {
      console.error(`ctxSize must be an integer in [512, 65536], got: ${positionals[0]}`);
      process.exit(1);
    }
  }

  await patch(ctxSize);
}

await main();
