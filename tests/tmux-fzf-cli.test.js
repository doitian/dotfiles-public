import { expect, test } from "bun:test";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

test("pickers work without shim files and reuse session lists for exact and fuzzy queries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tmux fzf cli "));
  const suffix = process.platform === "win32" ? ".exe" : "";
  try {
    const compiled = join(dir, `command${suffix}`);
    const build = await Bun.build({
      entrypoints: [fileURLToPath(new URL("./fixtures/tmux-fzf-command.js", import.meta.url))],
      compile: { outfile: compiled },
    });
    expect(build.success).toBe(true);
    for (const name of ["tmux", "fzf"]) await copyFile(compiled, join(dir, name + suffix));
    const log = join(dir, "calls.jsonl");
    for (const [picker, args, expected] of [
      ["pane", ["-s", "-p"], [["list-panes", "-s"], ["switchc", "-t", "=work:@1.%1"]]],
      ["pane", ["work"], [["has-session", "-t", "=work"], ["switchc", "-t", "=work"]]],
      ["pane", ["-a", "-k"], [["list-panes", "-a"], ["kill-pane", "-t", "=work:@1.%1"]]],
      ["session", [], [["list-windows", "-a"], ["switchc", "-t", "=work"]]],
      ["session", ["space session"], [["list-windows", "-a"], ["switchc", "-t", "=space session"]]],
      ["session", ["wor"], [["list-windows", "-a"], ["switchc", "-t", "=work"]]],
      ["session", ["brand new"], [["list-windows", "-a"], ["new-session", "-s", "brand new", "-d"], ["switchc", "-t", "=brand new"]]],
      ["session", ["-k"], [["list-windows", "-a"], ["kill-session", "-t", "=work"], ["kill-session", "-t", "=space session"]]],
    ]) {
      await Bun.write(log, "");
      const child = Bun.spawn([
        process.execPath, fileURLToPath(new URL(`../src/tmux-fzf-${picker}.js`, import.meta.url)), ...args,
      ], {
        env: {
          ...process.env, PATH: dir + delimiter + process.env.PATH,
          TMUX: "fixture", PSMUX_DATA_DIR: join(dir, "no-server"), PICKER_LOG: log,
        },
        stdin: "ignore", stdout: "pipe", stderr: "pipe",
      });
      const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
      expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
      const calls = (await Bun.file(log).text()).trim().split("\n").map(JSON.parse);
      const commands = calls.filter(({ tool }) => tool === "tmux").map(({ args }) => {
        const format = args.indexOf("-F");
        return format < 0 ? args : args.slice(0, format);
      });
      expect(commands).toEqual(expected);
      if (args[0] === "space session" || args[0] === "work") {
        expect(calls.some(({ tool }) => tool === "fzf")).toBe(false);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 15000);
