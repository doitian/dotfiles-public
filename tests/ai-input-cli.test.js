import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runBun } from "./helpers/run-bun.js";

let root;
let file;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "ai-input-test-"));
  file = join(root, "prompt.txt");
  await writeFile(file, "file content");
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

async function run(script, args, stdin = "") {
  return await runBun(`
    import { mock } from "bun:test";
    mock.module(${JSON.stringify(resolve("src/lib/secrets.js"))}, () => ({
      getOpenAICredentials: async () => ({ apiKey: "test", model: "test" }),
    }));
    mock.module(${JSON.stringify(resolve("src/lib/openai.js"))}, () => ({
      OpenAI: class {},
      runOneshot: async (_client, _model, options) => {
        console.log(JSON.stringify(options.input));
      },
    }));
    process.argv = [process.execPath, ...${JSON.stringify(args)}];
    await import(${JSON.stringify(resolve(`src/${script}.js`))});
  `, stdin);
}

function inputFor(script, stdout) {
  const input = JSON.parse(stdout);
  return script === "ai-shell" ? input.split("\n\nUser request: ")[1] : input;
}

for (const script of ["ai-shell", "ai-oneshot"]) {
  describe(script, () => {
    for (const flag of ["-f", "--file"]) {
      test(`${flag} reads a file with positional text before it and stdin after it`, async () => {
        const result = await run(script, [flag, file, "prefix"], "stdin content");
        expect(result.exitCode).toBe(0);
        expect(inputFor(script, result.stdout)).toBe("prefix\n\nfile content\n\nstdin content");
      });

      test(`${flag} - reads stdin once with positional text prepended`, async () => {
        const result = await run(script, [flag, "-", "prefix"], "stdin content");
        expect(result.exitCode).toBe(0);
        expect(inputFor(script, result.stdout)).toBe("prefix\n\nstdin content");
      });

      test(`${flag} - works without positional text`, async () => {
        const result = await run(script, [flag, "-"], "stdin content");
        expect(result.exitCode).toBe(0);
        expect(inputFor(script, result.stdout)).toBe("stdin content");
      });
    }

    test.each(["", "Hello, 世界 👋\r\nlast line"])(
      "explicit stdin preserves input %j with positional text",
      async (stdin) => {
        const result = await run(script, ["-f", "-", "prefix"], stdin);
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");
        expect(inputFor(script, result.stdout)).toBe(
          stdin ? `prefix\n\n${stdin}` : "prefix",
        );
      },
    );

    test("reads a file without positional text or stdin", async () => {
      const result = await run(script, ["-f", file]);
      expect(result.exitCode).toBe(0);
      expect(inputFor(script, result.stdout)).toBe("file content");
    });

    test("reports missing files", async () => {
      const missing = join(root, "missing.txt");
      const result = await run(script, ["-f", missing]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(`File not found: ${missing}`);
      expect(result.stdout).toBe("");
    });
  });
}

test("ai-shell still accepts piped input without --file", async () => {
  const result = await run("ai-shell", [], "stdin content\n");
  expect(result.exitCode).toBe(0);
  expect(inputFor("ai-shell", result.stdout)).toBe("stdin content");
});

test("ai-oneshot appends implicit stdin to positional text", async () => {
  const result = await run("ai-oneshot", ["prefix"], "stdin content");
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(inputFor("ai-oneshot", result.stdout)).toBe("prefix\n\nstdin content");
});

test("ai-shell still prefers positional text over implicit stdin", async () => {
  const result = await run("ai-shell", ["positional", "prompt"], "stdin content");
  expect(result.exitCode).toBe(0);
  expect(inputFor("ai-shell", result.stdout)).toBe("positional prompt");
});
