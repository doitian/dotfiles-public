import { afterEach, beforeEach, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../src/niri-scripts/niri-set-workspace-name.js", import.meta.url));
const linuxTest = test.skipIf(process.platform !== "linux");

let dir;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "niri-set-workspace-name-"));
  await mkdir(join(dir, "bin"));
  await writeFile(join(dir, "bin", "rofi"), '#!/bin/sh\nprintf "%s" "$TEST_ROFI_OUTPUT"\nexit "$TEST_ROFI_EXIT"\n');
  await writeFile(join(dir, "bin", "niri"), '#!/bin/sh\necho "$@" >> "$TEST_NIRI_LOG"\n');
  await chmod(join(dir, "bin", "rofi"), 0o755);
  await chmod(join(dir, "bin", "niri"), 0o755);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function run(output, exitCode) {
  const log = join(dir, "niri.log");
  await writeFile(log, "");
  const proc = Bun.spawn([process.execPath, script], {
    env: {
      ...process.env,
      PATH: `${join(dir, "bin")}:${process.env.PATH}`,
      TEST_ROFI_OUTPUT: output,
      TEST_ROFI_EXIT: String(exitCode),
      TEST_NIRI_LOG: log,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await proc.exited).toBe(0);
  return (await readFile(log, "utf8")).trim();
}

linuxTest("sets the submitted name", async () => {
  expect(await run("web dev\n", 0)).toBe("msg action set-workspace-name web dev");
});

linuxTest("unsets the name when empty input is submitted", async () => {
  expect(await run("\n", 0)).toBe("msg action unset-workspace-name");
});

linuxTest("leaves the name unchanged when the prompt is cancelled", async () => {
  expect(await run("", 1)).toBe("");
});
