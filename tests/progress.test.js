import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { updatePlan as linuxPlan } from "../src/mise-tasks/g-up-all-linux.js";
import { pluginCommands } from "../src/mise-tasks/g-up-plugins.js";
import { updatePlan as windowsPlan } from "../src/mise-tasks/g-up-all-windows.js";
import { parseInvocation, run as runOscProgress } from "../src/osc-progress.js";
import {
  createProgress,
  estimateInSlice,
  estimatePercent,
  formatProgress,
  PROGRESS_OWNER,
  slices,
} from "../src/lib/progress.js";

test("formatProgress emits OSC 9;4 states tmux and kitty parse", () => {
  expect(formatProgress("hidden")).toBe("\x1b]9;4;0\x1b\\");
  expect(formatProgress("normal", 42)).toBe("\x1b]9;4;1;42\x1b\\");
  expect(formatProgress("normal", 42.6)).toBe("\x1b]9;4;1;43\x1b\\");
  expect(formatProgress("normal", -4)).toBe("\x1b]9;4;1;0\x1b\\");
  expect(formatProgress("normal", 140)).toBe("\x1b]9;4;1;100\x1b\\");
  expect(formatProgress("error")).toBe("\x1b]9;4;2\x1b\\");
  expect(formatProgress("indeterminate")).toBe("\x1b]9;4;3\x1b\\");
  expect(formatProgress("paused", 10)).toBe("\x1b]9;4;4;10\x1b\\");
});

test("longer steps own a larger share and estimates stay inside the slice", () => {
  const [update, upgrade] = slices([15_000, 90_000]);
  expect(update.end).toBeCloseTo((15 / 105) * 100);
  expect(upgrade.end).toBe(100);
  expect(estimateInSlice(update.start, update.end, 0, update.estimateMs)).toBe(update.start);
  const late = estimateInSlice(upgrade.start, upgrade.end, 10 * upgrade.estimateMs, upgrade.estimateMs);
  expect(late).toBeGreaterThan(upgrade.start);
  expect(late).toBeLessThan(upgrade.end);
  expect(estimatePercent(1, 3, 0)).toBeCloseTo(100 / 3);
});

test("runSteps reports an estimated percentage for each step", async () => {
  const writes = [];
  const tracker = createProgress({ write: (seq) => writes.push(seq), env: {}, onExit() { } });
  const seen = [];
  await tracker.runSteps([
    { estimateMs: 15_000, run: () => seen.push(writes.at(-1)) },
    { estimateMs: 90_000, run: () => seen.push(writes.at(-1)) },
  ]);
  expect(seen).toEqual([
    formatProgress("normal", 0),
    formatProgress("normal", (15 / 105) * 100),
  ]);
  expect(writes.at(-1)).toBe(formatProgress("normal", 100));
  expect(writes.some((seq) => seq === formatProgress("indeterminate"))).toBe(false);
});

test("a running step advances its estimate instead of staying indeterminate", async () => {
  const writes = [];
  const tracker = createProgress({ write: (seq) => writes.push(seq), env: {}, onExit() { } });
  await tracker.runSteps([{ estimateMs: 40, run: () => Bun.sleep(90) }], 15);
  const percents = writes
    .filter((seq) => seq.startsWith("\x1b]9;4;1;"))
    .map((seq) => Number.parseFloat(seq.slice("\x1b]9;4;1;".length)));
  const running = percents.slice(0, -1);
  expect(running[0]).toBe(0);
  expect(Math.max(...running)).toBeGreaterThan(0);
  expect(Math.max(...running)).toBeLessThan(100);
  expect(writes.at(-1)).toBe(formatProgress("normal", 100));
  expect(writes).not.toContain(formatProgress("indeterminate"));
});

test("a failed step reports error and does not continue", async () => {
  const writes = [];
  const tracker = createProgress({ write: (seq) => writes.push(seq), env: {}, onExit() { } });
  let ran = false;
  await expect(tracker.runSteps([
    () => {
      throw new Error("nope");
    },
    () => {
      ran = true;
    },
  ])).rejects.toThrow("nope");
  expect(ran).toBe(false);
  expect(writes.at(-1)).toBe(formatProgress("error"));
});

test("nested work does not overwrite the owner's progress", async () => {
  const env = {};
  const writes = [];
  const parent = createProgress({ write: (seq) => writes.push(seq), env, onExit() { } });
  expect(parent.claim()).toBe(true);
  parent.report("normal", 25);
  const child = createProgress({ write: (seq) => writes.push(`child:${seq}`), env, onExit() { } });
  expect(child.claim()).toBe(false);
  await child.runSteps([() => { }]);
  child.finish(false);
  expect(env[PROGRESS_OWNER]).toBe("1");
  expect(writes).toEqual([formatProgress("normal", 25)]);
});

test("an aborted owner reports error on exit and ignores a later hook", () => {
  const writes = [];
  let hook;
  const tracker = createProgress({
    write: (seq) => writes.push(seq),
    env: {},
    onExit: (fn) => {
      hook = fn;
    },
  });
  tracker.claim();
  tracker.report("normal", 12);
  hook(1);
  hook(0);
  expect(writes).toEqual([formatProgress("normal", 12), formatProgress("error")]);
});

test("clearing hides progress and an intermediate step does not jump to 100", () => {
  const writes = [];
  const tracker = createProgress({ write: (seq) => writes.push(seq), env: {}, onExit() { } });
  tracker.clear();
  tracker.claim();
  tracker.hold(50);
  tracker.hook(0);
  expect(writes).toEqual([formatProgress("hidden"), formatProgress("normal", 50)]);
});

test("linux updater plans only the package managers that exist", () => {
  const which = (cmd) => ["apt", "pacman", "uv", "pi"].includes(cmd);
  const plan = linuxPlan(which);
  expect(plan.map((step) => step.args)).toEqual([
    ["sudo", "apt", "update"],
    ["sudo", "apt", "upgrade", "-y"],
    ["sudo", "pacman", "-Syu"],
    ["mise", "run", "g:up:uv"],
    ["mise", "run", "g:up:plugins"],
  ]);
  expect(plan[1].estimateMs).toBeGreaterThan(plan[0].estimateMs);
});

test("paru replaces pacman in the linux updater", () => {
  expect(linuxPlan((cmd) => cmd === "paru" || cmd === "pacman").map((step) => step.args)).toEqual([["paru", "-Syu"]]);
});

test("windows updater plans scoop and the shared tool steps", () => {
  expect(windowsPlan((cmd) => ["scoop", "bun", "claude"].includes(cmd)).map((step) => step.args)).toEqual([
    ["scoop", "update", "-a"],
    ["mise", "run", "g:up:bun"],
    ["mise", "run", "g:up:plugins"],
  ]);
});

test("plugin updates follow pi, opencode, then claude", () => {
  expect(pluginCommands(() => true)).toEqual(["pi", "opencode", "claude"]);
  expect(pluginCommands((cmd) => cmd === "opencode")).toEqual(["opencode"]);
});

test("osc-progress parses a step fraction and clears with no arguments", async () => {
  expect(parseInvocation([])).toEqual({ clear: true });
  expect(parseInvocation(["true"])).toEqual({ index: 0, count: 1, command: ["true"] });
  expect(parseInvocation(["2/3", "cmd", "arg"])).toEqual({ index: 1, count: 3, command: ["cmd", "arg"] });
  expect(() => parseInvocation(["0/2", "cmd"])).toThrow("invalid step");
  expect(() => parseInvocation(["1/2"])).toThrow("usage:");

  const cleared = Bun.spawn([process.execPath, "src/osc-progress.js"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, stdout, stderr] = await Promise.all([
    cleared.exited,
    new Response(cleared.stdout).text(),
    new Response(cleared.stderr).text(),
  ]);
  expect(code).toBe(0);
  expect(stdout).toBe("");
  expect(stderr).toBe("");
  expect(await runOscProgress([])).toBe(0);
});

test("osc-progress preserves the command status and an intermediate step", async () => {
  const failed = Bun.spawn([
    process.execPath,
    "src/osc-progress.js",
    process.execPath,
    "-e",
    "process.exit(3)",
  ]);
  expect(await failed.exited).toBe(3);

  const nested = Bun.spawn([
    process.execPath,
    "src/osc-progress.js",
    "1/2",
    process.execPath,
    "-e",
    "process.exit(Number(process.env.OSC_PROGRESS_OWNER !== '1'))",
  ], { env: { ...process.env, OSC_PROGRESS_OWNER: "1" } });
  expect(await nested.exited).toBe(0);

  const step = Bun.spawn([
    process.execPath,
    "src/osc-progress.js",
    "1/2",
    process.execPath,
    "-e",
    "process.exit(0)",
  ]);
  expect(await step.exited).toBe(0);
});

test("compiled osc-progress runs its command instead of exiting silently", async () => {
  const dir = await mkdtemp(join(tmpdir(), "osc-progress-compiled-"));
  try {
    const build = await Bun.build({
      entrypoints: [fileURLToPath(new URL("../src/osc-progress.js", import.meta.url))],
      minify: true,
      compile: { outfile: join(dir, "osc-progress"), autoloadDotenv: false, autoloadBunfig: false },
    });
    expect(build.success).toBe(true);
    const child = Bun.spawn([build.outputs[0].path, process.execPath, "-e", "process.exit(3)"], {
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await child.exited).toBe(3);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 30000);
