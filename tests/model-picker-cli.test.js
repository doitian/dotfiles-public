import { expect, test } from "bun:test";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

test("model pickers pass model queries and selections through their picker", async () => {
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
    const stateDir = join(dir, "state");
    Object.assign(env, { PICKER_LOG: log, XDG_STATE_HOME: stateDir, LOCALAPPDATA: stateDir });
    for (const picker of ["foc", "fpi"]) {
      for (const [options, models, usesFzf, code, selected = "test/alpha"] of [
        [["-m", "ALPHA"], ["test/alpha", "test/beta"], false, 0],
        [["--model", "alpha"], ["test/alpha"], false, 0],
        [["--model=alpha"], ["test/alpha"], false, 0],
        [["-m", "test"], ["test/alpha", "test/beta"], true, 0],
        [[], ["test/alpha"], true, 0],
        [["-m", "missing"], ["test/alpha"], picker === "fpi", 1],
        ...(picker === "foc" ? [
          [["-m", "alideep"], ["test/alpha", "alibaba-cn/deepseek-v4.1-flash"], false, 0, "alibaba-cn/deepseek-v4.1-flash"],
          [["--model=ALIDEEP"], ["alibaba-cn/deepseek-v4.1-flash"], false, 0, "alibaba-cn/deepseek-v4.1-flash"],
          [["-m", "alideep"], ["alibaba-cn/deepseek-v4.1-flash", "alibaba-cn/deepseek-v4.1-pro"], true, 0, "alibaba-cn/deepseek-v4.1-flash"],
          [["-m", "deepali"], ["alibaba-cn/deepseek-v4.1-flash"], false, 1],
          [["-m", "alphaa"], ["test/alpha"], false, 1],
        ] : []),
      ]) {
        await Bun.write(log, "");
        env.PICKER_MODELS = JSON.stringify(models);
        if (picker === "foc") env.PICKER_FZF_SELECTION = code === 0 ? selected : "";
        else delete env.PICKER_FZF_SELECTION;
        const args = picker === "foc" ? [...options, "run", "hello"] : [...options, "hello"];
        const child = Bun.spawn([
          process.execPath, fileURLToPath(new URL(`../src/${picker}.js`, import.meta.url)), ...args,
        ], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
        const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
        expect(exitCode, `${picker} ${args.join(" ")}: ${stderr}`).toBe(code);
        if (code === 0) expect(stderr).toBe("");
        const calls = (await Bun.file(log).text()).trim().split("\n").map(JSON.parse);
        expect(calls.some(({ tool }) => tool === "fzf")).toBe(picker === "foc" || usesFzf);
        if (picker === "foc") {
          expect(calls[0]).toEqual({ tool: "opencode", args: ["models"] });
          const fzf = calls.find(({ tool }) => tool === "fzf");
          expect(fzf.input).toBe(models.join("\n") + "\n");
          const query = options.length === 1 ? options[0].slice("--model=".length) : options[1];
          expect(fzf.args).toEqual([
            "--no-multi", "--ignore-case", `--history=${join(stateDir, "fzf", "foc-history")}`,
            ...(query ? [`--query=${query}`, "--select-1", "--exit-0"] : []),
          ]);
        }
        if (code === 0) {
          expect(calls.at(-1)).toEqual(picker === "foc"
            ? { tool: "opencode", args: ["run", "--model", selected, "hello"] }
            : { tool: "pi", args: ["--model", selected, "hello"] });
        } else {
          expect(calls.filter(({ tool }) => tool !== "fzf")).toHaveLength(1);
        }
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}, 15000);
