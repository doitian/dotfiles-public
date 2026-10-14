import { openSync, writeSync } from "node:fs";
import { constants } from "node:os";

// OSC 9;4 (ConEmu progress, read by kitty and tmux's progressbar feature).
const STATES = {
  hidden: 0,
  normal: 1,
  error: 2,
  indeterminate: 3,
  paused: 4,
};

export const PROGRESS_OWNER = "OSC_PROGRESS_OWNER";
export const DEFAULT_STEP_MS = 30_000;
const INTERVAL_MS = 500;

export function formatProgress(state, percent) {
  const code = STATES[state];
  if (code == null) throw new Error(`unknown progress state: ${state}`);
  let body = String(code);
  if ((state === "normal" || state === "paused") && Number.isFinite(percent)) {
    body += `;${Math.max(0, Math.min(100, Math.round(percent)))}`;
  }
  return `\x1b]9;4;${body}\x1b\\`;
}

export function slices(weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!(total > 0)) throw new Error("progress weights must be positive");
  let cursor = 0;
  return weights.map((weight) => {
    const start = (cursor / total) * 100;
    cursor += weight;
    return { start, end: (cursor / total) * 100, estimateMs: weight };
  });
}

// Approach the end of the slice, but do not reach it until the step finishes.
export function estimateInSlice(start, end, elapsedMs, stepMs = DEFAULT_STEP_MS) {
  const elapsed = Math.max(0, elapsedMs);
  const t = 1 - Math.exp(-elapsed / stepMs);
  return start + (end - start) * 0.95 * t;
}

export function estimatePercent(index, count, elapsedMs, stepMs = DEFAULT_STEP_MS) {
  return estimateInSlice((index / count) * 100, ((index + 1) / count) * 100, elapsedMs, stepMs);
}

function defaultWrite(seq) {
  if (defaultWrite.fd === undefined) {
    try {
      defaultWrite.fd = openSync("/dev/tty", "w");
    } catch {
      defaultWrite.fd = null;
    }
  }
  try {
    if (defaultWrite.fd != null) writeSync(defaultWrite.fd, seq);
    else if (process.stderr.isTTY) process.stderr.write(seq);
  } catch {
    defaultWrite.fd = null;
  }
}

export function createProgress({
  write = defaultWrite,
  env = process.env,
  onExit,
  signals = false,
  now = Date.now,
} = {}) {
  let owned = false;
  let settled = false;
  let hooked = false;

  function emit(state, percent) {
    write(formatProgress(state, percent));
  }

  function hook(code = 0) {
    if (!owned || settled) return;
    settled = true;
    emit(code === 0 ? "normal" : "error", code === 0 ? 100 : undefined);
  }

  function arm() {
    if (hooked) return;
    hooked = true;
    (onExit ?? ((fn) => process.on("exit", fn)))(hook);
    if (!signals) return;
    for (const sig of ["SIGINT", "SIGTERM"]) {
      const num = constants.signals[sig];
      if (!num) continue;
      process.on(sig, () => {
        finish(false);
        process.exit(128 + num);
      });
    }
  }

  function claim() {
    if (owned) return true;
    if (env[PROGRESS_OWNER]) return false;
    env[PROGRESS_OWNER] = "1";
    owned = true;
    arm();
    return true;
  }

  function report(state, percent) {
    if (!owned || settled) return;
    emit(state, percent);
  }

  function clear() {
    emit("hidden");
  }

  function hold(percent) {
    if (!owned || settled) return;
    settled = true;
    emit("normal", percent);
  }

  function finish(ok = true) {
    hook(ok ? 0 : 1);
  }

  async function duringSlice(slice, fn, intervalMs = INTERVAL_MS) {
    if (!owned) return fn();
    const started = now();
    const tick = () => report("normal", estimateInSlice(slice.start, slice.end, now() - started, slice.estimateMs));
    tick();
    const timer = setInterval(tick, intervalMs);
    timer.unref?.();
    try {
      return await fn();
    } finally {
      clearInterval(timer);
    }
  }

  function normalize(step) {
    if (typeof step === "function") return { run: step, estimateMs: DEFAULT_STEP_MS };
    return { run: step.run, estimateMs: step.estimateMs ?? DEFAULT_STEP_MS };
  }

  async function runSteps(steps, intervalMs = INTERVAL_MS) {
    if (steps.length === 0) return;
    const planned = steps.map(normalize);
    claim();
    const ranges = slices(planned.map((step) => step.estimateMs));
    try {
      for (let i = 0; i < planned.length; i++) {
        await duringSlice(ranges[i], planned[i].run, intervalMs);
      }
      finish(true);
    } catch (err) {
      finish(false);
      throw err;
    }
  }

  return { claim, report, clear, hold, finish, duringSlice, runSteps, hook };
}

const progress = createProgress({ signals: true });

export function claimProgress() {
  return progress.claim();
}

export function reportProgress(state, percent) {
  progress.report(state, percent);
}

export function clearProgress() {
  progress.clear();
}

export function holdProgress(percent) {
  progress.hold(percent);
}

export function finishProgress(ok = true) {
  progress.finish(ok);
}

export async function duringSlice(slice, fn, intervalMs) {
  return progress.duringSlice(slice, fn, intervalMs);
}

export async function runSteps(steps, intervalMs) {
  return progress.runSteps(steps, intervalMs);
}
