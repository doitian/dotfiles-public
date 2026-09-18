import { expect, test } from "bun:test";
import { chmod, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatTable, linuxInstances } from "../src/aiusage.js";

test("Linux usage renders accounts, balances, missing values, and sorted limits", () => {
  const data = { providers: {
    "opencode-go": { accounts: [{ limits: {
      monthly: { remaining_percent: 50 },
      weekly: { remaining_percent: 20 },
      rolling: { remaining_percent: 100 },
    } }] },
    moonshot: { accounts: [{ limits: { balance: { remaining_amount: 82.54592, currency: "CNY" } } }] },
    claude: { accounts: [
      { email: "one@example.com", limits: {
        seven_day: { remaining_percent: 78, resets_at: "2026-09-24T08:00:00Z" },
        five_hour: { remaining_percent: 91, resets_at: "2026-09-18T16:00:00Z" },
      } },
      { email: "two@example.com", error: "unavailable", limits: { five_hour: { remaining_percent: 90 } } },
    ] },
    codex: { error: "unavailable" },
    xai: { accounts: [{ limits: { weekly: null } }] },
  } };
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
