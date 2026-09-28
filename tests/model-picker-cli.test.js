import { expect, test } from "bun:test";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const OPENCODE_MODELS = ["test/alpha", "test/shared"];
const PI_MODELS = ["test/pi-alpha", "test/shared"];
const ALL_MODELS = [
  "opencode\ttest/alpha",
  "opencode\ttest/shared",
  "pi\ttest/pi-alpha",
  "pi\ttest/shared",
];

test("fa lists models from supported agents and forwards args", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fa cli "));
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
    Object.assign(env, {
      PICKER_LOG: log,
      XDG_STATE_HOME: stateDir,
      LOCALAPPDATA: stateDir,
      PICKER_MODELS_OPENCODE: JSON.stringify(OPENCODE_MODELS),
      PICKER_MODELS_PI: JSON.stringify(PI_MODELS),
    });

    const cases = [
      {
        args: [],
        selection: "pi\ttest/pi-alpha",
        listing: ["opencode", "pi"],
        picker: ALL_MODELS,
        query: "",
        expect: { tool: "pi", args: ["--model", "test/pi-alpha"] },
      },
      {
        args: ["-a", "oc", "alpha", "--", "run", "hello"],
        selection: "opencode\ttest/alpha",
        listing: ["opencode"],
        picker: ["opencode\ttest/alpha", "opencode\ttest/shared"],
        query: "alpha",
        expect: { tool: "opencode", args: ["run", "--model", "test/alpha", "hello"] },
      },
      {
        args: ["--agent=pi", "pi", "alpha"],
        selection: "pi\ttest/pi-alpha",
        listing: ["pi"],
        picker: ["pi\ttest/pi-alpha", "pi\ttest/shared"],
        query: "pi alpha",
        expect: { tool: "pi", args: ["--model", "test/pi-alpha"] },
      },
      {
        args: ["alpha"],
        selection: "opencode\ttest/alpha",
        listing: ["opencode", "pi"],
        picker: ALL_MODELS,
        query: "alpha",
        expect: { tool: "opencode", args: ["--standalone"], config: { model: "test/alpha" } },
      },
      {
        args: ["-a", "pi", "--", "hello"],
        selection: "pi\ttest/pi-alpha",
        listing: ["pi"],
        picker: ["pi\ttest/pi-alpha", "pi\ttest/shared"],
        query: "",
        expect: { tool: "pi", args: ["--model", "test/pi-alpha", "hello"] },
      },
      {
        args: ["-a", "nope"],
        code: 1,
        stderr: "unknown agent",
        listing: [],
        picker: null,
      },
      {
        args: ["-a"],
        code: 1,
        stderr: "requires an agent",
        listing: [],
        picker: null,
      },
      {
        args: ["alpha"],
        selection: "",
        code: 1,
        listing: ["opencode", "pi"],
        picker: ALL_MODELS,
        query: "alpha",
      },
    ];

    for (const scenario of cases) {
      await Bun.write(log, "");
      if ("selection" in scenario) env.PICKER_FZF_SELECTION = scenario.selection;
      else delete env.PICKER_FZF_SELECTION;
      const child = Bun.spawn(
        [
          process.execPath,
          fileURLToPath(new URL("../src/fa.js", import.meta.url)),
          ...scenario.args,
        ],
        { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" },
      );
      const [exitCode, stderr] = await Promise.all([
        child.exited,
        new Response(child.stderr).text(),
      ]);
      const label = `fa ${scenario.args.join(" ")}: ${stderr}`;
      expect(exitCode, label).toBe(scenario.code ?? 0);
      if (scenario.stderr) expect(stderr, label).toContain(scenario.stderr);

      const calls = (await Bun.file(log).text())
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(JSON.parse);
      const listing = calls
        .filter(({ args }) => args[0] === "models" || args[0] === "--list-models")
        .map(({ tool }) => tool)
        .sort();
      expect(listing, label).toEqual([...scenario.listing].sort());

      const fzf = calls.find(({ tool }) => tool === "fzf");
      if (!scenario.picker) {
        expect(fzf, label).toBeUndefined();
        continue;
      }
      expect(fzf.args, label).toEqual([
        "--no-multi",
        "--ignore-case",
        `--history=${join(stateDir, "fzf", "fa-history")}`,
        ...(scenario.query ? [`--query=${scenario.query}`] : []),
      ]);
      expect(fzf.input, label).toBe(scenario.picker.join("\n") + "\n");
      if (scenario.expect) {
        const last = calls.at(-1);
        expect(last.tool, label).toBe(scenario.expect.tool);
        expect(last.args, label).toEqual(scenario.expect.args);
        if (scenario.expect.config) expect(last.config, label).toEqual(scenario.expect.config);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}, 15000);