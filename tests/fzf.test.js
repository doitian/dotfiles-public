import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fzf } from "../src/lib/fzf.js";

describe.skipIf(process.platform === "win32")("fzf", () => {
  let dir;
  let originalPath;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fzf-test-"));
    await Bun.write(join(dir, "fzf"), '#!/bin/sh\nfor arg; do printf "%s\\n" "$arg"; done\ncat\nexit "${FAKE_FZF_EXIT:-0}"\n');
    await chmod(join(dir, "fzf"), 0o755);
    originalPath = process.env.PATH;
    process.env.PATH = dir + delimiter + originalPath;
  });

  afterEach(async () => {
    process.env.PATH = originalPath;
    delete process.env.FAKE_FZF_EXIT;
    await rm(dir, { recursive: true, force: true });
  });

  test("passes arguments and text input, returning exit code and stdout", async () => {
    expect(await fzf(["--no-multi", "-q", "a b"], "one\ntwo")).toEqual({
      code: 0,
      stdout: "--no-multi\n-q\na b\none\ntwo",
    });
  });

  test("returns a non-zero exit code with whatever fzf printed", async () => {
    process.env.FAKE_FZF_EXIT = "130";
    expect(await fzf([], "")).toEqual({ code: 130, stdout: "" });
  });

  test("accepts file input", async () => {
    const file = join(dir, "input.txt");
    await Bun.write(file, "from file\n");
    expect((await fzf([], Bun.file(file))).stdout).toBe("from file\n");
  });

  test("returns large output in full", async () => {
    const input = "x".repeat(1024 * 1024);
    const { code, stdout } = await fzf([], input);
    expect(code).toBe(0);
    expect(stdout.length).toBe(input.length);
  });
});
