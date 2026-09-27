import { expect, test } from "bun:test";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

test("model pickers auto-select only a unique command-line filter match", async () => {
  const dir = await mkdtemp(join(tmpdir(), "model picker cli "));
  const suffix = process.platform === "win32" ? ".exe" : "";
  try {
    const compiled = join(dir, `command${suffix}`);
    const build = await Bun.build({
      entrypoints: [fileURLToPath(new URL("./fixtures/model-picker-command.js", import.meta.url))],
      compile: { outfile: compiled },
    });
    expect(build.success).toBe(true);
    for (const name of ["opencode", "pi", "fzf"]) await copyFile(compiled, join(dir, name + suffix));
    const log = join(dir, "calls.jsonl");
    const env = { ...process.env };
    const pathKey = Object.keys(env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
    env[pathKey] = dir + delimiter + (env[pathKey] ?? "");
    Object.assign(env, { PICKER_LOG: log, XDG_STATE_HOME: dir });
    for (const picker of ["foc", "fpi"]) {
      for (const [options, models, usesFzf, code] of [
        [["-m", "ALPHA"], ["test/alpha", "test/beta"], false, 0],
        [["--model", "alpha"], ["test/alpha"], false, 0],
        [["--model=alpha"], ["test/alpha"], false, 0],
        [["-m", "test"], ["test/alpha", "test/beta"], true, 0],
        [[], ["test/alpha"], true, 0],
        [["-m", "missing"], ["test/alpha"], picker === "fpi", 1],
      ]) {
        await Bun.write(log, "");
        env.PICKER_MODELS = JSON.stringify(models);
        const args = picker === "foc" ? [...options, "run", "hello"] : [...options, "hello"];
        const child = Bun.spawn([
          process.execPath, fileURLToPath(new URL(`../src/${picker}.js`, import.meta.url)), ...args,
        ], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
        const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
        expect(exitCode).toBe(code);
        if (code === 0) expect(stderr).toBe("");
        const calls = (await Bun.file(log).text()).trim().split("\n").map(JSON.parse);
        expect(calls.some(({ tool }) => tool === "fzf")).toBe(usesFzf);
        if (code === 0) {
          expect(calls.at(-1)).toEqual(picker === "foc"
            ? { tool: "opencode", args: ["run", "--model", "test/alpha", "hello"] }
            : { tool: "pi", args: ["--model", "test/alpha", "hello"] });
        } else {
          expect(calls.filter(({ tool }) => tool !== "fzf")).toHaveLength(1);
        }
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}, 15000);
