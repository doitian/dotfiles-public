import { afterEach, expect, test } from "bun:test";
import { chmod, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createUsageReader, formatTable, linuxInstances, readInstances } from "../src/aiusage.js";

const cleanups = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

const snapshot = [{
  settings: { provider: "codex", label: "Work", limit: "five_hour" },
  usage: { remaining_percent: 10 },
  fetchedAt: 100,
}];
const fresh = {
  providers: {
    codex: {
      accounts: [{
        email: "work@example.com", active: true, limits: { five_hour: { remaining_percent: 85 } },
      }]
    }
  }, fetchedAt: 200
};

async function bridge(handler) {
  const requests = [];
  const server = Bun.serve({
    hostname: "127.0.0.1", port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname;
      requests.push(`${request.method} ${path}`);
      expect(request.headers.get("X-Ulanzi-Bridge")).toBe("1");
      return handler(request, path);
    },
  });
  cleanups.push(() => server.stop(true));
  const dir = await mkdtemp(join(tmpdir(), "aiusage-windows-"));
  cleanups.push(() => rm(dir, { recursive: true, force: true }));
  const cache = join(dir, "aiusage", "port.json");
  await mkdir(join(dir, "aiusage"));
  await Bun.write(cache, `${server.port}\n`);
  return { server, requests, dir, cache };
}

test("Windows refresh uses fresh provider data until configured snapshots catch up", async () => {
  let instances = snapshot;
  const { cache, requests } = await bridge((request, path) => Response.json(
    path === "/usage/refresh" ? fresh : { instances },
  ));
  const read = await createUsageReader(cache, () => { throw new Error("Unexpected discovery"); });
  expect(await read()).toEqual(snapshot);
  const updated = await read(true);
  expect(updated[0].settings).toEqual(snapshot[0].settings);
  expect(updated[0].usage.remaining_percent).toBe(85);
  expect((await read())[0].usage.remaining_percent).toBe(85);
  instances = [{ ...snapshot[0], fetchedAt: 300, usage: { remaining_percent: 70 } }];
  expect(await read()).toEqual(instances);
  expect(requests).toEqual([
    "GET /usage/fetch", "GET /usage/fetch", "POST /usage/refresh", "GET /usage/fetch", "GET /usage/fetch",
  ]);
});

test("Windows refresh preserves account filters, limits, labels, and balance selection", async () => {
  const rows = [
    { provider: "codex", account: " OTHER@EXAMPLE.COM ", limit: "seven_day", label: "Personal" },
    { provider: "moonshot", limit: "balance" },
    { provider: "claude", limit: "five_hour" },
    { provider: "codex", account: "missing@example.com", limit: "five_hour" },
    { provider: "xai", limit: "weekly" },
  ].map((settings) => ({ settings, fetchedAt: null, usage: { remaining_percent: 99 } }));
  const data = {
    fetchedAt: 200, providers: {
      codex: {
        accounts: [...fresh.providers.codex.accounts,
        { email: "other@example.com", limits: { seven_day: { used_percent: 25 } } }]
      },
      moonshot: { accounts: [{ limits: { balance: { remaining_amount: 12.5, currency: "CNY" } } }] },
      claude: { error: "auth_missing", accounts: [{ active: true, limits: { five_hour: { remaining_percent: 90 } } }] },
      xai: { limits: { weekly: { remaining_percent: 150 } } },
    }
  };
  const { cache } = await bridge((request, path) => Response.json(path === "/usage/refresh" ? data : { instances: rows }));
  const read = await createUsageReader(cache);
  const result = await read(true);
  expect(result.map((row) => row.settings)).toEqual(rows.map((row) => row.settings));
  expect(result.map((row) => row.usage)).toEqual([
    { remaining_percent: 75, resets_at: undefined }, { remaining_amount: 12.5, currency: "CNY" },
    {}, {}, { remaining_percent: 100, resets_at: undefined },
  ]);
});

test("Windows refresh errors preserve a validated port and normal polling recovers", async () => {
  let response = () => new Response("unavailable", { status: 503 });
  const { cache, server } = await bridge((request, path) => path === "/usage/refresh"
    ? response() : Response.json({ instances: snapshot }));
  const read = await createUsageReader(cache, () => { throw new Error("Unexpected discovery"); });
  await expect(read(true)).rejects.toThrow("refresh returned HTTP 503");
  expect(await Bun.file(cache).json()).toBe(server.port);
  expect(await read()).toEqual(snapshot);
  for (const data of [{ instances: [] }, { providers: [], fetchedAt: 200 }, { providers: {} }]) {
    response = () => Response.json(data);
    await expect(read(true)).rejects.toThrow("invalid provider data");
  }
  response = () => Response.json(fresh);
  expect((await read(true))[0].usage.remaining_percent).toBe(85);
});

test("Windows invalidates stale ports and validates discovered listeners before refreshing", async () => {
  const invalid = await bridge(() => Response.json({ unrelated: true }));
  const valid = await bridge((request, path) => Response.json(path === "/usage/refresh" ? fresh : { instances: snapshot }));
  let discoveries = 0;
  const read = await createUsageReader(invalid.cache, async () => {
    discoveries++;
    expect(await Bun.file(invalid.cache).exists()).toBe(false);
    return [invalid.server.port, valid.server.port];
  });
  expect((await read(true))[0].usage.remaining_percent).toBe(85);
  expect(discoveries).toBe(1);
  expect(await Bun.file(invalid.cache).json()).toBe(valid.server.port);
  expect(invalid.requests).toEqual(["GET /usage/fetch", "GET /usage/fetch"]);
  expect(valid.requests).toEqual(["GET /usage/fetch", "POST /usage/refresh"]);
});

test("Windows rejects invalid cached port values and bridge redirects", async () => {
  const { cache, server } = await bridge(() => new Response(null, {
    status: 302, headers: { Location: "http://127.0.0.1:1/usage/fetch" },
  }));
  await expect(readInstances(server.port)).rejects.toThrow();
  for (const value of [0, -1, 65536, "1234", {}, 1.5]) {
    await Bun.write(cache, JSON.stringify(value));
    let discovered = false;
    const read = await createUsageReader(cache, async () => { discovered = true; return []; });
    await expect(read()).rejects.toThrow("Could not read Ulanzi usage");
    expect(discovered).toBe(true);
  }
});

async function waitFor(predicate) {
  const deadline = Date.now() + 8000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for dashboard");
    await Bun.sleep(10);
  }
}

async function windowsCli(dir, args, interactive = false, executable = null) {
  const preload = join(dir, "tty.js");
  await Bun.write(preload, 'Object.defineProperty(process.stdout, "isTTY", { value: true });\nObject.defineProperty(process.stdin, "isTTY", { value: true });\nprocess.stdin.setRawMode = () => {};\n');
  const child = Bun.spawn(executable ? [executable, ...args] : [
    process.execPath, ...(interactive ? ["--preload", preload] : []), "src/aiusage.js", ...args,
  ], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, LOCALAPPDATA: dir }, stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  cleanups.push(async () => { child.kill(); await child.exited; });
  let output = "";
  const drained = (async () => {
    const decoder = new TextDecoder();
    for await (const chunk of child.stdout) output += decoder.decode(chunk, { stream: true });
    output += decoder.decode();
  })();
  return { child, output: () => output, drained, stderr: new Response(child.stderr).text() };
}

test.skipIf(process.platform !== "win32")("Windows CLI refreshes at launch with --once and redirected stdout", async () => {
  const { dir, requests } = await bridge((request, path) => Response.json(path === "/usage/refresh" ? fresh : { instances: snapshot }));
  for (const args of [["--once"], [], ["--once", "--refresh"], ["--refresh"]]) {
    requests.length = 0;
    const run = await windowsCli(dir, args);
    expect(await run.child.exited).toBe(0);
    await run.drained;
    expect(await run.stderr).toBe("");
    expect(run.output()).toContain(args.includes("--refresh") ? "85%" : "10%");
    expect(requests).toEqual(args.includes("--refresh")
      ? ["GET /usage/fetch", "POST /usage/refresh"] : ["GET /usage/fetch"]);
  }
});

test.skipIf(process.platform !== "win32")("Minified Windows executable runs main and refreshes usage", async () => {
  let failed = false;
  const { dir, requests } = await bridge((request, path) => path === "/usage/refresh" && failed
    ? new Response("unavailable", { status: 503 })
    : Response.json(path === "/usage/refresh" ? fresh : { instances: snapshot }));
  const executable = join(dir, "aiusage.exe");
  const build = await Bun.build({
    entrypoints: [fileURLToPath(new URL("../src/aiusage.js", import.meta.url))],
    minify: true, compile: { outfile: executable },
  });
  expect(build.success).toBe(true);
  const help = await windowsCli(dir, ["--help"], false, executable);
  expect(await help.child.exited).toBe(0);
  await help.drained;
  expect(help.output()).toContain("Usage: aiusage");
  const run = await windowsCli(dir, ["--once", "--refresh"], false, executable);
  expect(await run.child.exited).toBe(0);
  await run.drained;
  expect(run.output()).toContain("85%");
  expect(await run.stderr).toBe("");
  expect(requests).toEqual(["GET /usage/fetch", "POST /usage/refresh"]);
  failed = true;
  const failure = await windowsCli(dir, ["--refresh"], false, executable);
  expect(await failure.child.exited).toBe(1);
  await failure.drained;
  expect(failure.output()).toBe("");
  expect(await failure.stderr).toContain("Ulanzi refresh returned HTTP 503");
}, 15000);

test.skipIf(process.platform !== "win32")("Windows TUI queues r during reads, shows refresh failures, and resumes polling", async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  let reads = 0;
  let posts = 0;
  const { dir } = await bridge(async (request, path) => {
    if (path === "/usage/refresh") {
      posts++;
      return posts === 1 ? new Response("failed", { status: 503 }) : Response.json(fresh);
    }
    if (++reads === 1) await pending;
    return Response.json({ instances: snapshot });
  });
  const run = await windowsCli(dir, [], true);
  await waitFor(() => reads === 1);
  run.child.stdin.write("r");
  await run.child.stdin.flush();
  release();
  await waitFor(() => run.output().includes("refresh returned HTTP 503"));
  expect(posts).toBe(1);
  await waitFor(() => reads >= 3);
  expect(posts).toBe(1);
  run.child.stdin.write("r");
  await run.child.stdin.flush();
  await waitFor(() => run.output().includes("85%"));
  expect(posts).toBe(2);
  run.child.stdin.write("q");
  await run.child.stdin.flush();
  expect(await run.child.exited).toBe(0);
  await run.drained;
  expect(run.output()).toEndWith("\x1b[?25h\x1b[?1049l");
}, 15000);

for (const key of ["q", "\x03"]) {
  test.skipIf(process.platform !== "win32")(`Windows TUI exits during provider refresh with ${JSON.stringify(key)}`, async () => {
    let refreshing = false;
    const { dir } = await bridge((request, path) => {
      if (path === "/usage/refresh") {
        refreshing = true;
        return new Promise(() => { });
      }
      return Response.json({ instances: snapshot });
    });
    const run = await windowsCli(dir, ["--refresh"], true);
    await waitFor(() => refreshing);
    run.child.stdin.write(key);
    await run.child.stdin.flush();
    await waitFor(() => run.child.exitCode !== null);
    expect(await run.child.exited).toBe(0);
    await run.drained;
    expect(run.output()).toEndWith("\x1b[?25h\x1b[?1049l");
  }, 10000);
}

test("Linux usage renders accounts, balances, missing values, and sorted limits", () => {
  const data = {
    providers: {
      "opencode-go": {
        accounts: [{
          limits: {
            monthly: { remaining_percent: 50 },
            weekly: { remaining_percent: 20 },
            rolling: { remaining_percent: 100 },
          }
        }]
      },
      moonshot: { accounts: [{ limits: { balance: { remaining_amount: 82.54592, currency: "CNY" } } }] },
      claude: {
        accounts: [
          {
            email: "one@example.com", limits: {
              seven_day: { remaining_percent: 78, resets_at: "2026-09-24T08:00:00Z" },
              five_hour: { remaining_percent: 91, resets_at: "2026-09-18T16:00:00Z" },
            }
          },
          { email: "two@example.com", error: "unavailable", limits: { five_hour: { remaining_percent: 90 } } },
        ]
      },
      codex: { error: "unavailable" },
      xai: { accounts: [{ limits: { weekly: null } }] },
    }
  };
  const rows = Bun.stripANSI(formatTable(linuxInstances(data), Date.parse("2026-09-18T15:00:00Z")))
    .split("\n").map((line) => line.split(/ {2,}/));
  expect(rows).toEqual([
    ["Provider", "Limit", "Remaining", "Resets in"],
    ["Claude [one@example.com]", "5h", "91%", "1h"],
    ["Claude [one@example.com]", "7d", "78%", "5d"],
    ["Claude [two@example.com]", "-", "-", "-"],
    ["Codex", "-", "-", "-"],
    ["Moonshot", "balance", "82.55 CNY", "-"],
    ["OpenCode Go", "rolling", "100%", "-"],
    ["OpenCode Go", "7d", "20%", "-"],
    ["OpenCode Go", "monthly", "50%", "-"],
    ["xAI", "7d", "-", "-"],
  ]);
});

test("Linux usage rejects invalid payloads and accepts an empty provider map", () => {
  for (const data of [null, {}, { providers: [] }, { providers: "invalid" }]) {
    expect(() => linuxInstances(data)).toThrow("no providers object");
  }
  expect(linuxInstances({ providers: {} })).toEqual([]);
});

test.skipIf(process.platform !== "linux")("Linux CLI uses JSON without touching the Windows cache and reports command failures", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aiusage-test-"));
  try {
    await mkdir(join(dir, "aiusage"));
    const cache = join(dir, "aiusage", "port.json");
    await Bun.write(cache, "12345\n");
    const executable = join(dir, "ulanzi-niri");
    await Bun.write(executable, '#!/bin/sh\n[ "$*" = "$USAGE_ARGS" ] || exit 99\nprintf "%s\\n" "$USAGE_OUTPUT"\nprintf "%s" "$USAGE_ERROR" >&2\nexit "$USAGE_EXIT"\n');
    await chmod(executable, 0o755);
    async function run(output, error = "", exit = 0, args = ["--once"]) {
      const child = Bun.spawn([process.execPath, "src/aiusage.js", ...args], {
        cwd: new URL("../", import.meta.url).pathname,
        env: { ...process.env, PATH: dir, LOCALAPPDATA: dir, USAGE_OUTPUT: output, USAGE_ERROR: error, USAGE_EXIT: String(exit), USAGE_ARGS: args.includes("--refresh") ? "ai-usage --refresh --json" : "ai-usage --json" },
        stdout: "pipe", stderr: "pipe",
      });
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
      ]);
      expect(await Bun.file(cache).text()).toBe("12345\n");
      return { exitCode, stdout, stderr };
    }
    for (const args of [["--once"], [], ["--once", "--refresh"], ["--refresh"]]) {
      const result = await run('{"providers":{"codex":{"accounts":[{"limits":{"seven_day":{"remaining_percent":39}}}]}}}', "", 0, args);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Codex");
      expect(result.stdout).toContain("39%");
      expect(result.stderr).toBe("");
    }
    const failed = await run("null", "driver not running", 1);
    expect(failed.exitCode).toBe(1);
    expect(failed.stderr).toContain("driver not running");
    expect(failed.stdout).toBe("");
    const invalid = await run("not json");
    expect(invalid.exitCode).toBe(1);
    expect(invalid.stderr).toContain("invalid JSON");
    const missing = await run("{}");
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toContain("no providers object");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
