import { $ } from "bun";
import { afterAll, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext, Script } from "node:vm";

const skill = resolve("ai/local-skills/guided-pr-review");
const storeSource = await readFile(join(skill, "assets/pages-store.js"), "utf8");
const createStore = runInNewContext(`${storeSource}\ncreatePagesStore`, { TextEncoder });
const identity = { reviewId: "review-one", head: "a".repeat(40), base: "b".repeat(40), url: "https://github.com/example/repo/pull/1" };
const note = (id, text = "Why is this safe?") => ({ id, chunk: 1, file: "src/one.js", side: "new", line: 2, text });
const record = (notes = []) => ({ modelContent: { version: 1, ...identity, notes }, privateContent: { preserved: true } });

function fixture(widget = record(), pending) {
  const f = { widget, writes: [], last: null };
  f.store = createStore({
    read: () => f.widget,
    write: async snapshot => { f.writes.push(snapshot); f.widget = snapshot; },
  }, identity, {
    pending,
    validNote: n => !!n && typeof n.id === "string" && typeof n.text === "string" && n.chunk === 1 && n.file === "src/one.js" && n.side === "new" && n.line === 2,
    onChange: value => { f.last = value; },
  });
  return f;
}

test("opening, receiving remote notes, and flushing clean state do not write", async () => {
  const f = fixture();
  f.store.receive(f.widget);
  await f.store.flush();
  f.widget = record([note("remote")]);
  f.store.receive(f.widget);
  expect(f.last.notes.map(n => n.id)).toEqual(["remote"]);
  expect(f.writes).toHaveLength(0);
});

test("saves anchored questions alongside latest remote notes, preserving private state", async () => {
  const f = fixture();
  f.store.receive(f.widget);
  f.store.change("mine", note("mine"));
  f.widget = record([note("theirs")]);
  await f.store.flush();
  expect(f.widget.modelContent.notes.map(n => n.id)).toEqual(["theirs", "mine"]);
  expect(f.widget.modelContent).toMatchObject({ ...identity, version: 1 });
  expect(f.widget.privateContent).toEqual({ preserved: true });
  expect(f.widget.modelContent.reviewed).toBeUndefined();
  expect(f.widget.modelContent.current).toBeUndefined();
  expect(f.widget.modelContent.drafts).toBeUndefined();
  expect(f.store.hasPending()).toBe(false);
});

test("edits and deletes survive incoming updates and reload without publishing on load", async () => {
  const f = fixture(record([note("edit"), note("delete")]));
  f.store.receive(f.widget);
  f.store.change("edit", note("edit", "Updated question"));
  f.store.change("delete", null);
  f.widget = record([note("edit"), note("delete"), note("remote")]);
  f.store.receive(f.widget);
  const restored = fixture(f.widget, JSON.parse(JSON.stringify(f.last.pending)));
  restored.store.receive(restored.widget);
  expect(restored.last.notes.map(n => [n.id, n.text])).toEqual([["edit", "Updated question"], ["remote", "Why is this safe?"]]);
  expect(restored.writes).toHaveLength(0);
  await restored.store.flush();
  expect(restored.widget.modelContent.notes.map(n => n.id)).toEqual(["edit", "remote"]);
});

test.each([
  { ...record(), modelContent: { ...record().modelContent, head: "c".repeat(40) } },
  { ...record(), modelContent: { ...record().modelContent, base: "c".repeat(40) } },
  record([{ ...note("bad"), line: 999 }]),
  record([note("duplicate"), note("duplicate")]),
])("incompatible snapshots or malformed anchors cannot be overwritten", async widget => {
  const f = fixture(widget);
  f.store.change("mine", note("mine"));
  expect(f.store.receive(widget)).toBe(false);
  await expect(f.store.flush()).rejects.toThrow("another review or is invalid");
  expect(f.writes).toHaveLength(0);
  expect(f.last.notes.map(n => n.id)).toEqual(["mine"]);
  expect(f.store.hasPending()).toBe(true);
});

test("oversized UTF-8 notes stay available locally and can be shortened and retried", async () => {
  const f = fixture();
  const large = note("large", "问".repeat(6000));
  f.store.change(large.id, large);
  await expect(f.store.flush()).rejects.toThrow("size limit");
  expect(f.writes).toHaveLength(0);
  expect(f.last.notes[0].text).toBe(large.text);
  f.store.change(large.id, note(large.id));
  await f.store.flush();
  expect(f.writes).toHaveLength(1);
  expect(f.store.hasPending()).toBe(false);
});

test("failed shared writes retain pending questions for copy or retry", async () => {
  const f = fixture();
  const broken = createStore({ read: () => f.widget, write: async () => { throw Error("offline"); } }, identity,
    { validNote: n => typeof n.text === "string", onChange: v => { f.last = v; } });
  broken.change("mine", note("mine"));
  await expect(broken.flush()).rejects.toThrow("offline");
  expect(f.last.pending.mine.text).toBe("Why is this safe?");
  expect(broken.hasPending()).toBe(true);
});

test("serial writes preserve a newer edit made during a pending save", async () => {
  let widget = record(), complete;
  const writes = [];
  const store = createStore({ read: () => widget, write: async value => {
    writes.push(value);
    if (writes.length === 1) await new Promise(resolve => { complete = resolve; });
    widget = value;
  } }, identity, { validNote: n => typeof n.text === "string", onChange: () => {} });
  store.change("mine", note("mine", "First"));
  const first = store.flush();
  await new Promise(resolve => setTimeout(resolve, 0));
  store.change("mine", note("mine", "Second"));
  const second = store.flush();
  complete();
  await Promise.all([first, second]);
  expect(writes.map(w => w.modelContent.notes[0].text)).toEqual(["First", "Second"]);
  expect(store.hasPending()).toBe(false);
});

const directories = [];
afterAll(async () => {
  for (const dir of directories) await rm(dir, { recursive: true, force: true });
});

async function build(line = "const one = 2;") {
  const dir = await mkdtemp(join(tmpdir(), "guided-review-test-"));
  directories.push(dir);
  const metadata = { number: 1, title: "Synthetic review", url: identity.url,
    repositoryUrl: "https://github.com/example/repo", headRefOid: identity.head, mergeBaseOid: identity.base };
  const files = ["src/one.js", "src/two.js"].map(path => ({ path, short: path, status: "M", deleted: false, binary: false, recovered: false,
    additions: 1, deletions: 1, hunks: [{ index: 0 }], rows: [
      { kind: "hunk", text: "@@ -2 +2 @@", hunk: 0 },
      { kind: "del", text: "const one = 1;", old: 2, new: null, hunk: 0 },
      { kind: "add", text: line, old: null, new: 2, hunk: 0 },
    ] }));
  const plan = files.map((f, i) => ({ title: `Behavior ${i + 1}`, objective: "Inspect the behavior", focus: ["Does it preserve the contract?"], files: [f.path] }));
  await writeFile(join(dir, "snapshot.json"), JSON.stringify({ metadata, files }));
  await writeFile(join(dir, "plan.json"), JSON.stringify(plan));
  await $`python ${join(skill, "scripts/prepare.py")} build --directory ${dir} --plan ${join(dir, "plan.json")}`.quiet();
  return dir;
}

test("all review surfaces retain complete coverage and executable inline scripts", async () => {
  const dir = await build();
  const pages = await readFile(join(dir, "review-pages.html"), "utf8");
  const compatibility = JSON.parse(await readFile(join(dir, "pages-compatibility.json"), "utf8"));
  expect(compatibility.embeddable).toBe(true);
  expect(compatibility.utf8Bytes).toBe(Buffer.byteLength(pages, "utf8"));
  for (const name of ["review.html", "review-artifact.html", "review-pages.html"]) {
    const html = await readFile(join(dir, name), "utf8");
    const data = JSON.parse(html.match(/<script id="review-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    expect(data.chunks.flatMap(c => c.files.map(f => f.path))).toEqual(["src/one.js", "src/two.js"]);
    expect(data.head).toBe(identity.head);
    expect(data.base).toBe(identity.base);
    for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) expect(() => new Script(script[1])).not.toThrow();
    expect(html).not.toContain("__PAGES_STORE__");
    expect(html).not.toContain("\r");
  }
  expect(pages).not.toMatch(/<!doctype|<html|<head>|<body/i);
  expect(JSON.parse(await readFile(join(dir, "coverage.json"), "utf8"))).toMatchObject({ complete: true, changedFiles: 2, chunks: 2 });
});

test("oversized Pages output keeps every diff in the complete fallback", async () => {
  const dir = await build("问".repeat(50000));
  const compatibility = JSON.parse(await readFile(join(dir, "pages-compatibility.json"), "utf8"));
  expect(compatibility.embeddable).toBe(false);
  expect(compatibility.utf8Bytes).toBeGreaterThan(compatibility.limitBytes);
  const html = await readFile(join(dir, "review.html"), "utf8");
  expect(html.match(/问/g)).toHaveLength(100000);
});

test("template markers and script-like source remain literal diff data", async () => {
  const source = "const text = '__PAGES_STORE__ </script> & <tag>';";
  const dir = await build(source);
  for (const name of ["review.html", "review-artifact.html", "review-pages.html"]) {
    const html = await readFile(join(dir, name), "utf8");
    const data = JSON.parse(html.match(/<script id="review-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    expect(data.chunks[0].files[0].rows.at(-1).text).toBe(source);
  }
});

test("Python snapshot, build, and local server behaviors", async () => {
  const result = await $`python -B -m unittest discover -s ${resolve("tests/guided-pr-review-python")} -p 'test_*.py' -v`.quiet().nothrow();
  if (result.exitCode !== 0) throw new Error(result.stdout.toString() + result.stderr.toString());
  expect(result.exitCode).toBe(0);
}, 60000);
