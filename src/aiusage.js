#!/usr/bin/env bun
import { $ } from "bun";
import { mkdir, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

const LIMITS = {
  five_hour: "5h",
  seven_day: "7d",
  seven_day_fable: "7d fable",
  weekly: "7d",
  monthly: "monthly",
  rolling: "rolling",
  balance: "balance",
};

const LIMIT_ORDER = {
  rolling: 0,
  "5h": 0,
  "7d": 1,
  "7d fable": 1,
  monthly: 2,
  balance: 3,
};

function colorize(text, color) {
  let prefix = Bun.color(color, "ansi");
  if (prefix && color === "orange") prefix = Bun.color(color, "ansi-16m");
  return prefix ? `${prefix}${text}\x1b[0m` : text;
}

function singleLine(value) {
  return Bun.stripANSI(String(value)).replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
}

function resetTime(value, now) {
  const remaining = Date.parse(value) - now;
  if (!Number.isFinite(remaining)) return "-";
  if (remaining <= 0) return "due";
  for (const [unit, ms] of [["d", 86400000], ["h", 3600000], ["m", 60000]]) {
    if (remaining >= ms) return `${Math.floor(remaining / ms)}${unit}`;
  }
  return "<1m";
}

function formatRow(instance, now) {
  const settings = instance.settings ?? {};
  const usage = instance.usage ?? {};
  const provider = settings.label || settings.provider || "unknown";
  const account = settings.account ? ` [${singleLine(settings.account)}]` : "";
  const limit = LIMITS[settings.limit] ?? settings.limit ?? "usage";
  let value;
  if (typeof usage.remaining_percent === "number" && Number.isFinite(usage.remaining_percent)) {
    const percent = usage.remaining_percent;
    value = colorize(`${Number(percent.toFixed(1))}%`, percent <= 20 ? "red" : percent <= 50 ? "orange" : "green");
  } else if (typeof usage.remaining_amount === "number" && Number.isFinite(usage.remaining_amount)) {
    const amount = usage.remaining_amount;
    value = colorize(`${amount.toFixed(2)} ${singleLine(usage.currency || "")}`.trim(), amount <= 0 ? "red" : "green");
  } else {
    value = "-";
  }
  const reset = usage.resets_at ? resetTime(usage.resets_at, now) : "-";
  return [`${singleLine(provider)}${account}`, singleLine(limit), value, reset];
}

export function formatTable(instances, now = Date.now()) {
  if (!instances.length) return "No AI usage buttons found.";
  const rows = [
    ["Provider", "Limit", "Remaining", "Resets in"],
    ...instances.map((instance) => formatRow(instance, now))
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" })
        || (LIMIT_ORDER[a[1]] ?? 4) - (LIMIT_ORDER[b[1]] ?? 4)),
  ];
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((row) => Bun.stringWidth(row[column]))));
  return rows.map((row) => row.map((cell, column) => {
    const padding = " ".repeat(widths[column] - Bun.stringWidth(cell));
    return column === 2 ? padding + cell : cell + padding;
  }).join("  ").trimEnd()).join("\n");
}

async function findPorts() {
  const command = `
$ErrorActionPreference = 'Stop'
$ports = Get-CimInstance Win32_Process |
  Where-Object { $_.ProcessId -ne $PID -and ($_.CommandLine -replace '\\\\', '/') -like '*/me.iany.js.ulanziPlugin/*' } |
  ForEach-Object {
    Get-NetTCPConnection -State Listen -OwningProcess $_.ProcessId -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty LocalPort
  }
ConvertTo-Json -Compress -InputObject @($ports | Sort-Object -Unique)
`;
  const result = await $`powershell.exe -NoProfile -NonInteractive -Command ${command}`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new Error(`Could not discover Ulanzi ports: ${result.stderr.toString().trim()}`);
  }
  const ports = JSON.parse(result.stdout.toString().trim());
  if (!ports.length) throw new Error("No Ulanzi plugin listening port found. Start Ulanzi Studio and its AI usage plugin.");
  return ports;
}

export async function readInstances(port) {
  const response = await fetch(`http://127.0.0.1:${port}/instances`, {
    headers: { "X-Ulanzi-Bridge": "1" },
    signal: AbortSignal.timeout(3000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Ulanzi bridge returned HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data?.instances)) throw new Error("Ulanzi bridge returned no instances array");
  return data.instances;
}

export async function createUsageReader(cachePath, discoverPorts = findPorts) {
  const cached = await Bun.file(cachePath).json().catch(() => null);
  let port = Number.isInteger(cached) && cached > 0 && cached <= 65535 ? cached : undefined;
  return async function refresh() {
    if (port) {
      try {
        return await readInstances(port);
      } catch {
        port = undefined;
        await unlink(cachePath).catch(() => {});
      }
    }
    const ports = await discoverPorts();
    const errors = [];
    for (const candidate of ports) {
      try {
        const instances = await readInstances(candidate);
        port = candidate;
        try {
          await mkdir(dirname(cachePath), { recursive: true });
          await Bun.write(cachePath, `${port}\n`);
        } catch {}
        return instances;
      } catch (error) {
        errors.push(`${candidate}: ${error.message}`);
      }
    }
    throw new Error(`Could not read Ulanzi usage (${errors.join("; ")})`);
  };
}

export function linuxInstances(data) {
  const providers = data?.providers;
  if (!providers || typeof providers !== "object" || Array.isArray(providers)) {
    throw new Error("ulanzi-niri returned no providers object");
  }
  const labels = { claude: "Claude", codex: "Codex", "opencode-go": "OpenCode Go", moonshot: "Moonshot", xai: "xAI" };
  const instances = [];
  for (const [provider, details] of Object.entries(providers)) {
    const accounts = Array.isArray(details?.accounts) && details.accounts.length ? details.accounts : [{}];
    for (const account of accounts) {
      const settings = { provider, label: labels[provider] ?? provider, account: account?.email };
      const limits = account?.error ? null : account?.limits;
      const entries = limits && typeof limits === "object" && !Array.isArray(limits) ? Object.entries(limits) : [];
      if (!entries.length) instances.push({ settings: { ...settings, limit: "-" } });
      for (const [limit, usage] of entries) {
        instances.push({ settings: { ...settings, limit }, usage });
      }
    }
  }
  return instances;
}

export async function readLinuxInstances(refresh = false) {
  const args = refresh ? ["--refresh", "--json"] : ["--json"];
  const result = await $`ulanzi-niri ai-usage ${args}`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new Error(`Could not read Ulanzi usage: ${result.stderr.toString().trim() || `ulanzi-niri exited with code ${result.exitCode}`}`);
  }
  let data;
  try {
    data = JSON.parse(result.stdout.toString());
  } catch {
    throw new Error("ulanzi-niri returned invalid JSON");
  }
  return linuxInstances(data);
}

async function refreshLinuxUsage() {
  const result = await $`ulanzi-niri control refresh-ai-usage`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new Error(`Could not refresh Ulanzi usage: ${result.stderr.toString().trim() || `ulanzi-niri exited with code ${result.exitCode}`}`);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      once: { type: "boolean" },
      refresh: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log("Usage: aiusage [--once] [--refresh]\n\nShow Ulanzi AI usage, updating every 5 seconds. Press r to refresh, q or Ctrl+C to quit.\n--once     Print one snapshot (also used when stdout is redirected).\n--refresh  Refresh usage on launch (Linux fetches fresh provider data).\nWindows: Ulanzi Studio AI usage plugin. Linux: ulanzi-niri ai-usage --json.");
    return;
  }
  let refresh;
  if (process.platform === "linux") {
    refresh = readLinuxInstances;
  } else if (process.platform === "win32") {
    const cachePath = join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "aiusage", "port.json");
    refresh = await createUsageReader(cachePath);
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  if (values.once || !process.stdout.isTTY) {
    console.log(formatTable(await refresh(values.refresh)));
    return;
  }

  let timer;
  let stopped = false;
  let loading = false;
  let refreshRequested = false;
  const wasRaw = process.stdin.isRaw;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    if (process.stdin.isTTY) process.stdin.setRawMode(Boolean(wasRaw));
    process.stdout.write("\x1b[?25h\x1b[?1049l");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", (data) => {
      if (/[qQ\x03]/.test(data.toString())) stop();
      if (/[rR]/.test(data.toString())) {
        refreshRequested = true;
        if (!loading) {
          clearTimeout(timer);
          void tick();
        }
      }
    });
  }
  process.stdout.write("\x1b[?1049h\x1b[?25lLoading AI usage…\n");
  async function tick(force = false) {
    loading = true;
    let output;
    try {
      if (refreshRequested) {
        refreshRequested = false;
        if (process.platform === "linux") await refreshLinuxUsage();
      }
      output = formatTable(await refresh(force));
    } catch (error) {
      output = colorize(singleLine(error.message), "red");
    }
    loading = false;
    if (stopped) return;
    process.stdout.write(`\x1b[H\x1b[2J${output}\n\nr refresh · q quit\n`);
    timer = setTimeout(tick, refreshRequested ? 0 : 5000);
  }
  await tick(values.refresh);
}

if (import.meta.main) {
  await main().catch((error) => {
    console.error(`aiusage: ${singleLine(error.message)}`);
    process.exitCode = 1;
  });
}
