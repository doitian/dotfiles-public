import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { $ } from "bun";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  reasoningEffortBody,
  resolveThinking,
  THINKING_EFFORTS,
} from "../src/lib/ai-thinking.js";
import { runOneshot, streamCompletion } from "../src/lib/openai.js";
import { runBun } from "./helpers/run-bun.js";

let root;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "ai-thinking-test-"));
  await $`git init -q ${root}`.quiet();
  await writeFile(join(root, "change.txt"), "staged change\n");
  await $`git add change.txt`.cwd(root).quiet();
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

async function run(script, args = [], { forbidCredentials = false, model = "qwen-test", stdin = "", includePrompt = true } = {}) {
  const payloads = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const payload = await request.json();
      payloads.push(payload);
      if (payload.stream) {
        const chunks = [
          { choices: [{ delta: { content: "answer" }, finish_reason: null }] },
          { choices: [{ delta: {}, finish_reason: "stop" }] },
        ];
        return new Response(
          chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
          "data: [DONE]\n\n",
          { headers: { "Content-Type": "text/event-stream" } },
        );
      }
      return Response.json({ choices: [{ message: { content: "answer" } }] });
    },
  });
  try {
    const cliArgs = script === "git-mgen" || !includePrompt ? args : [...args, "prompt"];
    const result = await runBun(`
      import { mock } from "bun:test";
      mock.module(${JSON.stringify(resolve("src/lib/secrets.js"))}, () => ({
        getOpenAICredentials: async () => {
          if (${forbidCredentials}) throw new Error("Unexpected credential lookup");
          return { apiKey: "test", baseURL: ${JSON.stringify(server.url.href)}, model: ${JSON.stringify(model)} };
        },
      }));
      process.chdir(${JSON.stringify(root)});
      process.argv = [process.execPath, ...${JSON.stringify(cliArgs)}];
      await import(${JSON.stringify(resolve(`src/${script}.js`))});
    `, stdin);
    return { ...result, payloads };
  } finally {
    server.stop(true);
  }
}

function expectPayload(result, effort, script) {
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout).toBe("answer\n");
  expect(result.payloads).toHaveLength(1);
  const payload = result.payloads[0];
  expect(payload.reasoning_effort).toBe(effort);
  expect(payload).not.toHaveProperty("enable_thinking");
  expect(payload).not.toHaveProperty("thinking_budget");
  expect(payload).not.toHaveProperty("extra_body");
  expect(payload.messages.at(-1).role).toBe("user");
  expect(payload.temperature).toBe(script === "git-mgen" ? 0.2 : 0.3);
  if (script !== "git-mgen") expect(payload.stream).toBe(true);
}

for (const [script, defaultEffort] of [
  ["ai-oneshot", "medium"],
  ["ai-shell", "low"],
  ["git-mgen", "none"],
]) {
  describe(script, () => {
    test(`defaults to ${defaultEffort}`, async () => {
      expectPayload(await run(script), defaultEffort, script);
    });

    test.each(THINKING_EFFORTS)("sends explicit --thinking %s", async (effort) => {
      expectPayload(await run(script, ["--thinking", effort]), effort, script);
    });

    test("sends none for non-Qwen models too", async () => {
      const result = await run(script, ["--thinking=none"], { model: "gpt-test" });
      expectPayload(result, "none", script);
      expect(result.payloads[0].model).toBe("gpt-test");
    });

    test.each(["invalid", "LOW", "", "0"])("rejects invalid effort %j before credentials or requests", async (effort) => {
      const result = await run(script, [`--thinking=${effort}`], { forbidCredentials: true });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Invalid --thinking value");
      expect(result.stderr).toContain(THINKING_EFFORTS.join("|"));
      expect(result.stdout).toBe("");
      expect(result.payloads).toHaveLength(0);
    });

    test.each([{ args: ["--thinking"] }, { args: ["--thinking", "--help"] }])("rejects missing effort %j", async ({ args }) => {
      const result = await run(script, args, { forbidCredentials: true, includePrompt: false });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("--thinking");
      expect(result.stderr).not.toContain("Unexpected credential lookup");
      expect(result.stdout).toBe("");
      expect(result.payloads).toHaveLength(0);
    });

    test.each(["-h", "--help"])("%s documents default, efforts and model support without credentials", async (flag) => {
      const result = await run(script, [flag], { forbidCredentials: true });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain(`Usage: ${script}`);
      expect(result.stdout).toContain("--thinking <effort>");
      expect(result.stdout).toContain(`default: ${defaultEffort}`);
      expect(result.stdout).toContain(THINKING_EFFORTS.join("|"));
      expect(result.stdout).toContain("Supported efforts depend on the configured model");
      expect(result.payloads).toHaveLength(0);
    });
  });
}

test.each([undefined, "none"])("ai-oneshot line mode uses effort %j for every input", async (effort) => {
  const result = await run("ai-oneshot", effort ? ["--thinking", effort] : [], {
    includePrompt: false,
    stdin: "first\nsecond\n",
  });
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout).toBe("answer\nanswer\n");
  expect(result.payloads.map((payload) => payload.reasoning_effort)).toEqual([
    effort ?? "medium",
    effort ?? "medium",
  ]);
  expect(result.payloads.map((payload) => payload.messages.at(-1).content)).toEqual(["first", "second"]);
});

test.each([
  { args: ["--no-thinking"] },
  { args: ["--no-thinking", "--thinking", "none"] },
  { args: ["--thinking", "none", "--no-thinking"] },
])("ai-oneshot preserves the no-thinking alias %j", async ({ args }) => {
  expectPayload(await run("ai-oneshot", args), "none", "ai-oneshot");
});

test.each(["minimal", "low", "medium", "high", "xhigh", "max"])("ai-oneshot rejects no-thinking conflicts with %s", async (effort) => {
  for (const args of [
    ["--no-thinking", "--thinking", effort],
    ["--thinking", effort, "--no-thinking"],
  ]) {
    const result = await run("ai-oneshot", args, { forbidCredentials: true });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--no-thinking conflicts with --thinking");
    expect(result.payloads).toHaveLength(0);
  }
});

test("ai-oneshot help documents the alias and conflict rule", async () => {
  const result = await run("ai-oneshot", ["--help"], { forbidCredentials: true });
  expect(result.stdout).toContain("Alias for --thinking none; conflicts with other efforts");
});

test("shared helper validates efforts and retains unspecified behavior for other callers", () => {
  expect(resolveThinking(undefined, "medium")).toBe("medium");
  expect(resolveThinking("none", "medium")).toBe("none");
  expect(reasoningEffortBody(undefined)).toEqual({});
  expect(reasoningEffortBody("none")).toEqual({ reasoning_effort: "none" });
  expect(() => reasoningEffortBody("invalid")).toThrow("Invalid --thinking value");
});

test("streaming validates before requesting and preserves deltas and refusal handling", async () => {
  const payloads = [];
  let output = "";
  const client = {
    chat: {
      completions: {
        create: async (payload) => {
          payloads.push(payload);
          return (async function* () {
            yield { choices: [{ delta: { content: "answer" } }] };
            yield { choices: [{ finish_reason: "refusal" }] };
          })();
        }
      }
    },
  };
  const outputStream = { write: (text) => { output += text; } };
  await expect(streamCompletion(client, "test", [], { thinking: "invalid", outputStream })).rejects.toThrow("Invalid --thinking value");
  expect(payloads).toHaveLength(0);
  await expect(streamCompletion(client, "test", [], { thinking: "none", outputStream })).rejects.toThrow("Model refused or content filtered.");
  expect(output).toBe("answer");
  expect(payloads[0].reasoning_effort).toBe("none");
});

test("runOneshot retains noThinking compatibility for ai-polish", async () => {
  let payload;
  const client = {
    chat: {
      completions: {
        create: async (body) => {
          payload = body;
          return (async function* () {
            yield { choices: [{ delta: { content: "\n" }, finish_reason: "stop" }] };
          })();
        }
      }
    },
  };
  await runOneshot(client, "qwen-test", { input: "prompt", noThinking: true });
  expect(payload.reasoning_effort).toBe("none");
  expect(payload).not.toHaveProperty("enable_thinking");
  await expect(runOneshot(client, "test", { input: " " })).rejects.toThrow("No input on stdin.");
});
