import { $, YAML } from "bun";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

let root;
let preload;
let editor;
const source = resolve("src/jrnl.js");

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "jrnl-test-"));
  preload = join(root, "preload.js");
  const io = pathToFileURL(resolve("src/lib/io.js")).href;
  await writeFile(preload, `
import { mock } from "bun:test";
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [process.env.JRNL_TEST_NOW])); }
  static now() { return new RealDate(process.env.JRNL_TEST_NOW).getTime(); }
};
const io = await import(${JSON.stringify(io)});
mock.module(${JSON.stringify(io)}, () => ({ ...io, readClipboard: async () => process.env.JRNL_TEST_CLIPBOARD }));
`);
  const editorSource = join(root, "editor.js");
  await writeFile(editorSource, `await Bun.write(process.env.JRNL_TEST_EDITOR_LOG, JSON.stringify(process.argv.slice(2)));`);
  editor = join(root, process.platform === "win32" ? "fake-vim.exe" : "fake-vim");
  const result = await Bun.build({ entrypoints: [editorSource], compile: { outfile: editor } });
  if (!result.success) throw new AggregateError(result.logs);
}, 30000);

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

async function fixture(folders = ["Dropbox/Brain/journal"]) {
  const home = await mkdtemp(join(root, "home-"));
  for (const folder of folders) await mkdir(join(home, folder), { recursive: true });
  return { home, dir: folders.length ? join(home, folders[0]) : null };
}

async function run(f, args = ["-p"], options = {}) {
  const input = Buffer.from(options.input ?? "");
  const env = {
    ...process.env,
    HOME: f.home,
    USERPROFILE: f.home,
    TZ: options.zone ?? "UTC",
    EDITOR: editor,
    JRNL_TEST_EDITOR_LOG: join(f.home, "editor.json"),
    JRNL_TEST_NOW: options.now ?? "2026-09-24T10:23:00Z",
    JRNL_TEST_CLIPBOARD: options.clipboard ?? "",
  };
  const result = await $`${process.execPath} --preload ${preload} ${source} ${args} < ${input}`
    .env(env).quiet().nothrow();
  return { code: result.exitCode, out: result.stdout.toString().trim(), err: result.stderr.toString() };
}

function properties(text) {
  expect(text.startsWith("---\n")).toBe(true);
  expect(text).not.toContain("\r");
  return YAML.parse(text.split("---\n")[1]);
}

test.each([
  ["UTC", "2026-01-01T00:01:00Z", "2026-01-01", "2025-12-31", "2026-01-02"],
  ["Asia/Shanghai", "2025-12-31T16:01:00Z", "2026-01-01", "2025-12-31", "2026-01-02"],
  ["America/Los_Angeles", "2026-01-01T07:59:00Z", "2025-12-31", "2025-12-30", "2026-01-01"],
  ["Pacific/Kiritimati", "2024-02-28T10:01:00Z", "2024-02-29", "2024-02-28", "2024-03-01"],
  ["Pacific/Kiritimati", "2024-02-29T10:01:00Z", "2024-03-01", "2024-02-29", "2024-03-02"],
  ["America/New_York", "2026-03-08T07:30:00Z", "2026-03-08", "2026-03-07", "2026-03-09"],
  ["America/New_York", "2026-11-01T06:30:00Z", "2026-11-01", "2026-10-31", "2026-11-02"],
])("local date and navigation across %s %s", async (zone, now, day, previous, next) => {
  const f = await fixture();
  const result = await run(f, ["-p"], { zone, now });
  expect(result.code).toBe(0);
  expect(result.out).toBe(join(f.dir, `Journal ${day}.md`));
  const text = await readFile(result.out, "utf8");
  expect(properties(text)).toEqual({ created: `[[${day}]]`, next: `[[Journal ${next}]]`, prev: `[[Journal ${previous}]]`, tags: ["kind/journal"] });
  expect(text).toMatch(/---\n# Journal on .+\n\n## Journal\n$/);
  expect(text).not.toContain("::");
});

test.each([
  ["Dropbox/Brain/journal", "Brain/journal", ".journal"],
  ["Brain/journal", ".journal"],
  [".journal"],
])("uses the first available journal folder: %j", async (...folders) => {
  const f = await fixture(folders);
  const result = await run(f);
  expect(result.code).toBe(0);
  expect(result.out).toBe(join(f.dir, "Journal 2026-09-24.md"));
  for (const folder of folders.slice(1)) expect(await readdir(join(f.home, folder))).toEqual([]);
});

test("reports a missing journal directory without creating one", async () => {
  const f = await fixture([]);
  const result = await run(f);
  expect(result.code).toBe(1);
  expect(result.err).toContain("No journal directory found");
  expect(await readdir(f.home)).toEqual([]);
});

test("path mode preserves existing content and modification time", async () => {
  const f = await fixture();
  const file = join(f.dir, "Journal 2026-09-24.md");
  const original = "---\naliases: [Keep]\n---\n# Local journal\n**Kind**:: #journal\n\nOriginal note\n";
  await writeFile(file, original);
  const before = await stat(file);
  const result = await run(f);
  expect(result.code).toBe(0);
  expect(await readFile(file, "utf8")).toBe(original);
  expect((await stat(file)).mtimeMs).toBe(before.mtimeMs);
});

test("existing enum properties, kind order, topic tags and line endings are preserved", async () => {
  const f = await fixture();
  const file = join(f.dir, "Journal 2026-09-24.md");
  const original = '---\nkind: [journal, reference]\ntags: [topic]\nstatus: later\n---\n# Existing\r\nKeep [[Link]] ^block\n';
  await writeFile(file, original);
  const before = await stat(file, { bigint: true });
  const path = await run(f);
  expect(path.code).toBe(0);
  expect(await readFile(file, "utf8")).toBe(original);
  expect((await stat(file, { bigint: true })).mtimeNs).toBe(before.mtimeNs);
  const appended = await run(f, ["Title"], { input: "Body\n" });
  expect(appended.code).toBe(0);
  expect(await readFile(file, "utf8")).toBe(original + "\n### 10:23 Title\n\nBody\n");
});

test("existing classification tags retain their order during no-op and append", async () => {
  const f = await fixture();
  const file = join(f.dir, "Journal 2026-09-24.md");
  const original = '---\ntags: [kind/journal, obsidian/help, now, zettel/index, topic]\n---\n# Existing\r\nKeep [[Link]] ^block\n';
  await writeFile(file, original);
  const before = await stat(file, { bigint: true });
  expect((await run(f)).code).toBe(0);
  expect(await readFile(file, "utf8")).toBe(original);
  expect((await stat(file, { bigint: true })).mtimeNs).toBe(before.mtimeNs);
  expect((await run(f, ["Title"], { input: "Body\n" })).code).toBe(0);
  expect(await readFile(file, "utf8")).toBe(original + "\n### 10:23 Title\n\nBody\n");
});

test("appends titled stdin without rewriting an existing journal", async () => {
  const f = await fixture();
  const file = join(f.dir, "Journal 2026-09-24.md");
  const original = "# Existing\n**Kind**:: #journal\n\n## Journal\n";
  await writeFile(file, original);
  const result = await run(f, ["A", "title"], { input: "Body 中文\n\n", zone: "Asia/Shanghai" });
  expect(result.code).toBe(0);
  expect(await readFile(file, "utf8")).toBe(original + "\n### 18:23 A title\n\nBody 中文\n");
});

test("empty stdin moves the title into the body", async () => {
  const f = await fixture();
  const result = await run(f, ["Title", "only"]);
  expect(result.code).toBe(0);
  const text = await readFile(result.out, "utf8");
  expect(properties(text).tags).toEqual(["kind/journal"]);
  expect(properties(text)).not.toHaveProperty("kind");
  expect(text.endsWith("\n### 10:23\n\nTitle only\n")).toBe(true);
});

test("clipboard mode preserves heading and trimmed body semantics", async () => {
  const f = await fixture();
  const result = await run(f, ["-c", "Clipboard"], { clipboard: "Captured text\n\n" });
  expect(result.code).toBe(0);
  expect((await readFile(result.out, "utf8")).endsWith("\n### 10:23 Clipboard\n\nCaptured text\n")).toBe(true);
});

test("empty input reports an error without appending an entry", async () => {
  const f = await fixture();
  const result = await run(f, []);
  expect(result.code).toBe(1);
  expect(result.err).toContain("No input provided");
  const text = await readFile(join(f.dir, "Journal 2026-09-24.md"), "utf8");
  expect(text.endsWith("## Journal\n")).toBe(true);
});

test("edit mode opens the journal at the bottom without rewriting it", async () => {
  const f = await fixture();
  const file = join(f.dir, "Journal 2026-09-24.md");
  const original = "# Local edits remain\n";
  await writeFile(file, original);
  const before = await stat(file);
  const result = await run(f, ["-e"]);
  expect(result.code).toBe(0);
  expect(JSON.parse(await readFile(join(f.home, "editor.json"), "utf8"))).toEqual(["+$", file]);
  expect(await readFile(file, "utf8")).toBe(original);
  expect((await stat(file)).mtimeMs).toBe(before.mtimeMs);
});
