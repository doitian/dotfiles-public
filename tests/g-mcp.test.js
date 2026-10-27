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
  oauth: false,
  headers: { Authorization: "Bearer {env:TC002_TOKEN}" },
};

test("toClaudeEnvSyntax rewrites OpenCode placeholders in nested values", () => {
  expect(toClaudeEnvSyntax({ a: ["{env:A}", "x{env:B_2}y"], b: { c: "{env:C}" }, n: 1 }))
    .toEqual({ a: ["${A}", "x${B_2}y"], b: { c: "${C}" }, n: 1 });
});

test("claude-code remote entries use http, Claude placeholders, and no boolean oauth", () => {
  expect(toClaudeEntry({ ...remote, enabled: true, disabled: true }, "claude-code")).toEqual({
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
  "mcp": { "servers": { "tc": ${JSON.stringify(remote)}, }, },
}
`,
  );
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

async function run(args) {
  const proc = Bun.spawn([process.execPath, script, ...args], {
    env: { ...process.env, HOME: home, USERPROFILE: home },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { code, stdout, stderr };
}

test("enable reads a JSONC template and writes the Claude Code entry", async () => {
  const { code, stdout, stderr } = await run(["enable", "claude-code", "tc"]);
  expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
  expect(stdout).toBe("claude-code: tc mcp enabled\n");
  const config = JSON.parse(await readFile(join(home, ".claude.json"), "utf8"));
  expect(config.mcpServers.tc).toEqual(toClaudeEntry(remote, "claude-code"));
});

test("enable writes OpenCode servers under mcp.servers without enabled", async () => {
  const { code, stdout, stderr } = await run(["enable", "opencode", "tc"]);
  expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
  expect(stdout).toBe("opencode: tc mcp enabled\n");
  const config = JSON.parse(await readFile(join(home, ".config", "opencode", "opencode.jsonc"), "utf8"));
  expect(config.mcp.servers.tc).toEqual(remote);
  expect(config.mcp.tc).toBeUndefined();
  expect(config.mcp.servers.tc.enabled).toBeUndefined();
  expect(config.mcp.servers.tc.disabled).toBeUndefined();
});

test("disable lifts a V1 OpenCode server and sets disabled", async () => {
  const dir = join(home, ".config", "opencode");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "opencode.jsonc"),
    JSON.stringify({
      mcp: {
        tc: { ...remote, enabled: true },
        timeout: { catalog: 30000 },
      },
    }),
  );

  const disabled = await run(["disable", "opencode", "tc"]);
  expect({ code: disabled.code, stderr: disabled.stderr }).toEqual({ code: 0, stderr: "" });
  expect(disabled.stdout).toBe("opencode: tc mcp disabled\n");

  const config = JSON.parse(await readFile(join(dir, "opencode.jsonc"), "utf8"));
  expect(config.mcp.tc).toBeUndefined();
  expect(config.mcp.timeout).toEqual({ catalog: 30000 });
  expect(config.mcp.servers.tc).toEqual({ ...remote, disabled: true });

  const status = await run(["status", "opencode", "tc"]);
  expect(status.stdout).toBe("opencode: tc mcp disabled\n");
});
