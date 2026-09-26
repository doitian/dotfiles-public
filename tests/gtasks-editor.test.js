import { expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { editTaskInEditor, runTasksTui } from "../src/gtasks.js";

test("external editor round-trips multiline drafts and removes temporary files", async () => {
  let editedPath;
  const result = await editTaskInEditor("Title\nNotes", {
    editor: "custom-editor",
    runEditor: async (path, { editor }) => {
      editedPath = path;
      expect(editor).toBe("custom-editor");
      expect(await readFile(path, "utf8")).toBe("Title\nNotes\n");
      await writeFile(path, "Changed\n\n  Indented\n\nMore notes\n");
    },
  });
  expect(result).toBe("Changed\n\n  Indented\n\nMore notes\n");
  await expect(stat(dirname(editedPath))).rejects.toThrow();
});

test("unchanged drafts are cancelled and editor failures clean up", async () => {
  expect(await editTaskInEditor("Title", { runEditor: async () => {} })).toBeNull();
  expect(await editTaskInEditor("Title", { runEditor: async () => 1 })).toBeNull();
  let editedPath;
  await expect(editTaskInEditor("Title", {
    runEditor: async path => {
      editedPath = path;
      throw new Error("Editor failed");
    },
  })).rejects.toThrow("Editor failed");
  await expect(stat(dirname(editedPath))).rejects.toThrow();
});

const tick = () => new Promise(resolve => setImmediate(resolve));

test.each(["save", "unchanged", "failure", "invalid", "save failure"])("Ctrl+E restores the terminal after %s", async scenario => {
  const input = new PassThrough();
  const output = new PassThrough();
  input.isTTY = output.isTTY = true;
  input.isRaw = false;
  const modes = [];
  input.setRawMode = raw => { input.isRaw = raw; modes.push(raw); };
  output.columns = 120;
  output.rows = 24;
  let screen = "";
  output.on("data", chunk => { screen += chunk; });
  const edits = [];
  const api = {
    getList: async () => ({ title: "Tasks" }),
    list: async () => [
      { id: "a", title: "First", position: "1" },
      { id: "b", title: "Second", notes: "Notes", position: "2" },
    ],
    edit: async (...args) => {
      if (scenario === "save failure") throw new Error("Save failed");
      edits.push(args);
    },
  };
  const drafts = [];
  let release;
  let opened;
  let ready = new Promise(resolve => { opened = resolve; });
  const pending = runTasksTui(api, "list", {
    input, output,
    editExternal: async initial => {
      drafts.push(initial);
      expect(input.isRaw).toBe(false);
      expect(input.isPaused()).toBe(true);
      expect(screen).toEndWith("\x1b[?2004l\x1b[?25h\x1b[?1049l");
      opened();
      await new Promise(resolve => { release = resolve; });
      if (scenario === "failure") throw new Error("Editor failed");
      if (scenario === "unchanged") return null;
      if (scenario === "invalid") return "\nNotes only";
      return "Updated\n\nDescription\n";
    },
  });
  try {
    await tick();
    input.write("j\x05");
    await ready;
    expect(drafts).toEqual(["Second\n\nNotes"]);
    input.emit("keypress", "q", { name: "q" });
    release();
    await tick();
    expect(input.isRaw).toBe(true);
    expect(input.isPaused()).toBe(false);
    if (scenario === "invalid" || scenario === "save failure") {
      const error = scenario === "invalid" ? "first line must contain a title" : "Save failed";
      const draft = scenario === "invalid" ? "\nNotes only" : "Updated\n\nDescription\n";
      expect(screen).toContain(error);
      ready = new Promise(resolve => { opened = resolve; });
      input.emit("keypress", "e", { name: "e" });
      await ready;
      expect(drafts.at(-1)).toBe(draft);
      release();
      await tick();
      expect(screen).toContain(error);
      input.emit("keypress", "", { name: "escape" });
      await tick();
    }
    if (scenario === "failure") expect(screen).toContain("Editor failed");
    expect(edits).toEqual(scenario === "save" ? [["list", "b", { title: "Updated", notes: "Description" }]] : []);
  } finally {
    release?.();
    input.emit("end");
    await pending;
  }
  expect(modes.slice(0, 4)).toEqual([true, false, true, false]);
  expect(modes.at(-1)).toBe(false);
  expect(input.listenerCount("keypress")).toBe(0);
  expect(screen).toEndWith("\x1b[?2004l\x1b[?25h\x1b[?1049l");
});
