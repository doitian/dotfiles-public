import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exists, touch, writeIfNotExists } from "../src/lib/fs.js";

let directory;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "dotfiles-test-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("exists recognizes files and directories", async () => {
  const file = join(directory, "existing.txt");
  await writeFile(file, "content");
  expect(await exists(file)).toBe(true);
  expect(await exists(directory)).toBe(true);
});

test("exists returns false for a missing path", async () => {
  expect(await exists(join(directory, "missing.txt"))).toBe(false);
});

test("writeIfNotExists writes UTF-8 content and returns its byte length", async () => {
  const file = join(directory, "new.txt");
  const content = "Hello, 世界\n";
  expect(await writeIfNotExists(file, content)).toBe(Buffer.byteLength(content));
  expect(await readFile(file, "utf8")).toBe(content);
});

test("writeIfNotExists preserves an existing file", async () => {
  const file = join(directory, "existing.txt");
  await writeFile(file, "original");
  expect(await writeIfNotExists(file, "replacement")).toBe(0);
  expect(await readFile(file, "utf8")).toBe("original");
});

test("touch creates an empty file", async () => {
  const file = join(directory, "empty.txt");
  await touch(file);
  expect(await readFile(file, "utf8")).toBe("");
});

test("touch preserves existing content", async () => {
  const file = join(directory, "existing.txt");
  await writeFile(file, "keep me");
  await touch(file);
  expect(await readFile(file, "utf8")).toBe("keep me");
});
