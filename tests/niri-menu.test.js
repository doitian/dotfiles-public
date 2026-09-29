import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../src/niri-scripts/niri-menu.js", import.meta.url));
const linuxTest = test.skipIf(process.platform !== "linux");

async function fixture(state, unloaded = false) {
  const dir = await mkdtemp(join(tmpdir(), "niri-menu "));
  const bin = join(dir, "bin");
  const runtime = join(dir, "runtime");
  await mkdir(bin);
  await mkdir(join(runtime, "hyprwhspr"), { recursive: true });
  if (unloaded) await writeFile(join(runtime, "hyprwhspr", "model_unloaded"), "");
  await writeFile(join(bin, "systemctl"), `#!/bin/sh
if [ "$*" = "--user show hyprwhspr.service --property=ActiveState --value" ]; then
  printf '%s\\n' "$TEST_STATE"
  exit "$TEST_STATUS_EXIT"
fi
printf 'systemctl %s\\n' "$*" >> "$TEST_LOG"
printf '%s' "$TEST_ERROR" >&2
exit "$TEST_ACTION_EXIT"
`, { mode: 0o755 });
  await writeFile(join(bin, "hyprwhspr"), `#!/bin/sh
printf 'hyprwhspr %s\\n' "$*" >> "$TEST_LOG"
printf '%s' "$TEST_ERROR" >&2
exit "$TEST_ACTION_EXIT"
`, { mode: 0o755 });
  const env = {
    ...process.env,
    HOME: dir,
    PATH: bin,
    XDG_RUNTIME_DIR: runtime,
    ROFI_DATA: JSON.stringify(["Hyprwhspr"]),
    ROFI_RETV: "0",
    TEST_STATE: state,
    TEST_LOG: join(dir, "actions"),
    TEST_STATUS_EXIT: "0",
    TEST_ACTION_EXIT: "0",
    TEST_ERROR: "",
  };
  return { dir, env };
}

async function run(env, selection) {
  const child = Bun.spawn([process.execPath, script, ...(selection ? [selection] : [])], {
    env: { ...env, ROFI_RETV: selection ? "1" : "0" },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  const labels = stdout.split("\n").filter((line) => line && !line.startsWith("\0"))
    .map((line) => line.split("\0")[0]);
  return { code, stdout, stderr, labels };
}

for (const [state, unloaded, labels] of [
  ["active", false, ["Stop service", "Restart service", "Unload model"]],
  ["active", true, ["Stop service", "Restart service", "Reload model"]],
  ["inactive", false, ["Start service"]],
  ["inactive", true, ["Start service"]],
  ["failed", true, ["Start service"]],
  ["activating", false, ["Stop service", "Restart service"]],
  ["reloading", false, ["Stop service", "Restart service"]],
  ["deactivating", true, []],
]) {
  linuxTest(`hyprwhspr menu: ${state}, unloaded=${unloaded}`, async () => {
    const { dir, env } = await fixture(state, unloaded);
    try {
      expect(await run(env)).toMatchObject({ code: 0, labels });
      expect(await Bun.file(env.TEST_LOG).exists()).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

for (const [state, unloaded, selection, command] of [
  ["inactive", false, "Start service", "systemctl --user start hyprwhspr.service"],
  ["active", false, "Stop service", "systemctl --user stop hyprwhspr.service"],
  ["active", false, "Restart service", "systemctl --user restart hyprwhspr.service"],
  ["active", false, "Unload model", "hyprwhspr model unload"],
  ["active", true, "Reload model", "hyprwhspr model reload"],
]) {
  linuxTest(`hyprwhspr action: ${selection}`, async () => {
    const { dir, env } = await fixture(state, unloaded);
    try {
      expect(await run(env, selection)).toMatchObject({ code: 0, stdout: "" });
      expect(await Bun.file(env.TEST_LOG).text()).toBe(`${command}\n`);
      expect(await run({ ...env, TEST_ACTION_EXIT: "1", TEST_ERROR: "test failure" }, selection))
        .toMatchObject({ code: 1, stdout: "", stderr: expect.stringContaining("test failure") });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

linuxTest("hyprwhspr rechecks state before acting on a stale selection", async () => {
  const { dir, env } = await fixture("active", true);
  try {
    expect(await run(env, "Unload model")).toMatchObject({ code: 0, stdout: "" });
    expect(await run({ ...env, TEST_STATE: "inactive" }, "Reload model"))
      .toMatchObject({ code: 0, stdout: "" });
    expect(await Bun.file(env.TEST_LOG).exists()).toBe(false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("hyprwhspr status failure does not offer a start action", async () => {
  const { dir, env } = await fixture("inactive");
  try {
    expect(await run({ ...env, TEST_STATUS_EXIT: "1" }))
      .toMatchObject({ code: 1, labels: [], stderr: expect.stringContaining("cannot read hyprwhspr service status") });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
