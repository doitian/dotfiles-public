import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { runFzf, unwrapShim } from "../src/lib/tmux-fzf.js";
import { sessionFromFzf, sessionsFromWindows } from "../src/tmux-fzf-session.js";

function picker() {
  const exited = Promise.withResolvers();
  let output;
  const written = [];
  const process = {
    exitCode: null,
    exited: exited.promise,
    stdout: new ReadableStream({ start(controller) { output = controller; } }),
    stdin: { write(text) { written.push(text); }, end() { written.push(null); } },
    kill() { finish(143); },
  };
  function finish(code, text = "") {
    process.exitCode = code;
    output.enqueue(new TextEncoder().encode(text));
    output.close();
    exited.resolve(code);
  }
  return { process, written, finish };
}

test("fzf starts before a slow list is ready and receives the completed input", async () => {
  const input = Promise.withResolvers();
  const fzf = picker();
  const spawned = Promise.withResolvers();
  let started = false;
  const result = runFzf(["--query", "two words"], () => {
    expect(started).toBe(true);
    return input.promise;
  }, (args, options) => {
    expect(basename(args[0])).toMatch(/^fzf(?:\.exe)?$/);
    expect(args.slice(1)).toEqual(["--query", "two words"]);
    expect(options.stdin).toBe("pipe");
    started = true;
    spawned.resolve();
    return fzf.process;
  });
  await spawned.promise;
  expect(started).toBe(true);
  expect(fzf.written).toEqual([]);
  input.resolve("=work:@1\twork:\t2 windows\n");
  await Bun.sleep(0);
  expect(fzf.written).toEqual(["=work:@1\twork:\t2 windows\n", null]);
  fzf.finish(0, "selection\n");
  expect(await result).toEqual({ code: 0, stdout: "selection\n" });
});

test("cancelling fzf does not wait for the list or write to its closed stdin", async () => {
  const input = Promise.withResolvers();
  const fzf = picker();
  const spawned = Promise.withResolvers();
  const result = runFzf([], () => input.promise, () => {
    spawned.resolve();
    return fzf.process;
  });
  await spawned.promise;
  fzf.finish(130);
  expect(await result).toEqual({ code: 130, stdout: "" });
  input.resolve("late result");
  await Bun.sleep(0);
  expect(fzf.written).toEqual([]);
});

test("a list failure closes fzf and propagates the error", async () => {
  const fzf = picker();
  await expect(runFzf([], async () => {
    throw new Error("server unavailable");
  }, () => fzf.process)).rejects.toThrow("server unavailable");
  expect(fzf.process.exitCode).toBe(143);
});

test("only plain Scoop path shims are bypassed, including targets with spaces", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tmux fzf shim "));
  try {
    const executable = join(dir, "tmux.exe");
    const shim = join(dir, "tmux.shim");
    const target = join(dir, "actual tmux.exe");
    await Bun.write(target, "fixture");
    expect(await unwrapShim(executable)).toBe(executable);
    await Bun.write(shim, `path = "${target}"\r\n`);
    expect(await unwrapShim(executable)).toBe(target);
    for (const extra of ['args = "-L custom"', 'cwd = "C:/work"']) {
      await Bun.write(shim, `path = "${target}"\n${extra}\n`);
      expect(await unwrapShim(executable)).toBe(executable);
    }
    await Bun.write(shim, 'path = "relative.exe"\n');
    expect(await unwrapShim(executable)).toBe(executable);
    await Bun.write(shim, `path = "${join(dir, "missing.exe")}"\n`);
    expect(await unwrapShim(executable)).toBe(executable);
    expect(await unwrapShim("tmux")).toBe("tmux");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("session previews prefer active windows and exclude the picker when it is active", () => {
  const rows = [
    "work\t@1\teditor\t0\t1\t3 windows",
    "work\t@2\tshell\t0\t0\t3 windows",
    "work\t@3\tTMUX_FZF_WIN\t1\t0\t3 windows",
    "other session\t@4\teditor\t0\t1\t2 windows (attached)",
    "other session\t@5\tshell\t1\t0\t2 windows (attached)",
  ];
  expect(sessionsFromWindows(rows.join("\r\n") + "\r\n")).toBe(
    "=work:@1\twork:\t3 windows\n=other session:@5\tother session:\t2 windows (attached)",
  );
});

test("session previews fall back to an ordinary window, or the only picker window", () => {
  expect(sessionsFromWindows([
    "work\t@1\tTMUX_FZF_WIN\t1\t0\t2 windows",
    "work\t@2\tshell\t0\t0\t2 windows",
    "alone\t@3\tTMUX_FZF_WIN\t1\t0\t1 windows",
  ].join("\n"))).toBe("=work:@2\twork:\t2 windows\n=alone:@3\talone:\t1 windows");
  expect(sessionsFromWindows("")).toBe("");
});

test("fzf selection distinguishes an existing session from a new session query", () => {
  expect(sessionFromFzf("query\r\n=work:@1\twork:\t2 windows\r\n"))
    .toEqual({ query: "query", session: "work" });
  expect(sessionFromFzf("new session\n")).toEqual({ query: "new session", session: "" });
  expect(sessionFromFzf("\n")).toEqual({ query: "", session: "" });
});
