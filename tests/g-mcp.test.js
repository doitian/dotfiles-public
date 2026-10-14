import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { toClaudeEntry, toClaudeEnvSyntax } from "../src/mise-tasks/g-mcp.js";

const script = fileURLToPath(new URL("../src/mise-tasks/g-mcp.js", import.meta.url));

const remote = {
  type: "remote",
  url: "http://10.0.0.5:8008/mcp/",
  enabled: true,
  oauth: false,
  headers: { Authorization: "Bearer {env:TC002_TOKEN}" },
};

test("toClaudeEnvSyntax rewrites OpenCode placeholders in nested values", () => {
  expect(toClaudeEnvSyntax({ a: ["{env:A}", "x{env:B_2}y"], b: { c: "{env:C}" }, n: 1 }))
    .toEqual({ a: ["${A}", "x${B_2}y"], b: { c: "${C}" }, n: 1 });
});

test("claude-code remote entries use http, Claude placeholders, and no boolean oauth", () => {
  expect(toClaudeEntry(remote, "claude-code")).toEqual({
    type: "http",
    url: "http://10.0.0.5:8008/mcp/",
    headers: { Authorization: "Bearer ${TC002_TOKEN}" },
  });
});

test("claude-code keeps an oauth options object", () => {
  const entry = toClaudeEntry({ type: "remote", url: "https://x.example/mcp", oauth: { scopes: "read" } }, "claude-code");
  expect(entry.oauth).toEqual({ scopes: "read" });
});

test("claude-desktop bridges remote servers through mcp-remote", () => {
  expect(toClaudeEntry(remote, "claude-desktop")).toEqual({
    command: "bunx",
    args: ["mcp-remote", "http://10.0.0.5:8008/mcp/", "--allow-http", "--header", "Authorization:Bearer ${TC002_TOKEN}"],
  });
  expect(toClaudeEntry({ type: "remote", url: "https://x.example/mcp" }, "claude-desktop").args)
    .toEqual(["mcp-remote", "https://x.example/mcp"]);
});

test("local entries translate placeholders in args and env", () => {
  expect(toClaudeEntry({ type: "local", command: ["uvx", "srv", "{env:A}"], environment: { K: "{env:B}" } }, "claude-code"))
    .toEqual({ command: "uvx", args: ["srv", "${A}"], env: { K: "${B}" } });
});

let home;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "g-mcp-"));
  await mkdir(join(home, ".dotfiles", "repos", "public", "ai"), { recursive: true });
  await writeFile(
    join(home, ".dotfiles", "repos", "public", "ai", "mcp.jsonc"),
    `{
  // comments and trailing commas are allowed
  "mcp": { "tc": ${JSON.stringify(remote)}, },
}
`,
  );
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

test("enable reads a JSONC template and writes the Claude Code entry", async () => {
  const proc = Bun.spawn([process.execPath, script, "enable", "claude-code", "tc"], {
    env: { ...process.env, HOME: home, USERPROFILE: home },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
  expect(stdout).toBe("claude-code: tc mcp enabled\n");
  const config = JSON.parse(await readFile(join(home, ".claude.json"), "utf8"));
  expect(config.mcpServers.tc).toEqual(toClaudeEntry(remote, "claude-code"));
});
