import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

let root;
let project;
let launcher;
const windows = process.platform === "win32";

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "tmux-up-test-"));
  project = join(root, "project with spaces");
  await mkdir(project);
  await mkdir(join(root, "dist"));
  const fixture = join(root, "tmux.js");
  await writeFile(fixture, `
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
const input = args[0] === "-C" ? await Bun.stdin.text() : "";
appendFileSync(process.env.TMUX_TEST_LOG, JSON.stringify({ args, input, pid: process.pid, ppid: process.ppid }) + "\\n");
if (args[0] === "has-session") process.exit(Number(process.env.TMUX_TEST_MISSING || 0));
if (args[0] === "new") process.exit(Number(process.env.TMUX_TEST_CREATE_EXIT || 0));
if (args[0] === "attach") process.exit(23);
`);
  launcher = join(root, "dist", windows ? "tmux-up.exe" : "tmux-up");
  for (const [entrypoint, outfile] of [
    [fixture, join(root, windows ? "tmux.exe" : "tmux")],
    [resolve("src/tmux-up.js"), launcher],
  ]) {
    const result = await Bun.build({ entrypoints: [entrypoint], compile: { outfile } });
    if (!result.success) throw new AggregateError(result.logs);
  }
}, 30000);

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

async function run(args, env = {}) {
  const log = join(root, `${crypto.randomUUID()}.jsonl`);
  const command = [launcher, ...args];
  const spawnEnv = { ...process.env };
  const pathKey = Object.keys(spawnEnv).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
  spawnEnv[pathKey] = `${root}${delimiter}${spawnEnv[pathKey] ?? ""}`;
  Object.assign(spawnEnv, {
    TMUX: "",
    TMUX_TEST_LOG: log,
    TMUX_TEST_PROJECT: project,
  }, env);
  const child = Bun.spawn(command, {
    env: spawnEnv,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, stdout, stderr] = await Promise.all([
    child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
  ]);
  const calls = (await readFile(log, "utf8")).trim().split("\n").map(JSON.parse);
  return { code, stdout, stderr, calls, pid: child.pid };
}

test("setup prints an exact target without attaching to an existing session", async () => {
  const result = await run(["--print-target", project]);
  expect(result.code).toBe(0);
  expect(result.stdout).toBe("=project with spaces\n");
  expect(result.calls.map(c => c.args)).toEqual([["has-session", "-t", "=project with spaces"]]);
});

test("setup completes a new session's configuration before printing its target", async () => {
  const config = join(project, ".tmux-work.conf");
  await writeFile(config, "neww -n tasks\n");
  const result = await run(["--print-target", config], { TMUX_TEST_MISSING: "1" });
  expect(result.code).toBe(0);
  expect(result.stdout).toBe("=project with spaces/work\n");
  expect(result.calls[1].args).toEqual(["new", "-d", "-c", project, "-s", "project with spaces/work"]);
  expect(result.calls[2].args).toEqual(["-C", "attach", "-t", "=project with spaces/work"]);
  expect(result.calls[2].input).toBe("neww -n tasks\n\ndetach-client\n");
});

test("failed setup prints no target and never attaches", async () => {
  const result = await run(["--print-target", project], { TMUX_TEST_MISSING: "1", TMUX_TEST_CREATE_EXIT: "7" });
  expect(result.code).not.toBe(0);
  expect(result.stdout).toBe("");
  expect(result.calls.map(c => c.args[0])).toEqual(["has-session", "new"]);
});

test.skipIf(windows)("POSIX attach replaces the launcher and preserves the exit code", async () => {
  const result = await run([project]);
  expect(result.code).toBe(23);
  expect(result.calls.at(-1).pid).toBe(result.pid);
  expect(result.calls.at(-1).args).toEqual(["attach", "-t", "=project with spaces"]);
});
