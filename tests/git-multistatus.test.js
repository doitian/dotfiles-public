import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../src/git-multistatus.js", import.meta.url));

let dir;
const env = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};

async function git(cwd, ...args) {
  const proc = Bun.spawn(["git", ...args], { cwd, env, stdout: "ignore", stderr: "pipe" });
  if ((await proc.exited) !== 0) throw new Error(await new Response(proc.stderr).text());
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "git-multistatus-"));
  env.GIT_CONFIG_GLOBAL = join(dir, "gitconfig");
  await writeFile(env.GIT_CONFIG_GLOBAL, "");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function multistatus(...dirs) {
  const proc = Bun.spawn([process.execPath, script, "-p", ...dirs], { env, stdout: "pipe", stderr: "pipe" });
  const [code, stdout] = await Promise.all([proc.exited, new Response(proc.stdout).text()]);
  expect(code).toBe(0);
  return stdout.trimEnd().split("\n");
}

test("reports dotted branch names with ahead/behind counts and dirty state", async () => {
  const origin = join(dir, "origin");
  const clone = join(dir, "clone");
  await git(dir, "init", "-q", "-b", "release-1.2", origin);
  await git(origin, "commit", "-q", "--allow-empty", "-m", "one");
  await git(dir, "clone", "-q", origin, clone);
  await git(origin, "commit", "-q", "--allow-empty", "-m", "upstream");
  await git(clone, "commit", "-q", "--allow-empty", "-m", "local");
  await git(clone, "fetch", "-q");

  expect(await multistatus(clone)).toEqual([`${clone}\t  release-1.2 (ahead 1 ↑ behind 1 ↓)`]);

  await writeFile(join(clone, "new.txt"), "x");
  expect(await multistatus(clone)).toEqual([`${clone}\t  release-1.2 (dirty) (ahead 1 ↑ behind 1 ↓)`]);
});

test("marks clean repos in sync and skips non-repos", async () => {
  const repo = join(dir, "repo");
  await git(dir, "init", "-q", "-b", "main", repo);
  await git(repo, "commit", "-q", "--allow-empty", "-m", "one");
  expect(await multistatus(repo, join(dir, "missing"))).toEqual([`${repo}\t  main (≡)`]);
});
