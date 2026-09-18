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

async function main() {
  const { values } = parseArgs({
    options: {
      once: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log("Usage: aiusage [--once]\n\nShow Ulanzi AI usage, refreshing every 5 seconds. Press q or Ctrl+C to quit.\n--once  Print one snapshot (also used when stdout is redirected).\nWindows only; Linux support is deferred.");
    return;
  }
  if (process.platform !== "win32") {
    throw new Error(process.platform === "linux"
      ? "Linux support is deferred; ulanzi-niri ai-usage is not integrated yet."
      : `Unsupported platform: ${process.platform}`);
  }

  const cachePath = join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "aiusage", "port.json");
  const refresh = await createUsageReader(cachePath);

  if (values.once || !process.stdout.isTTY) {
    console.log(formatTable(await refresh()));
    return;
  }

  let timer;
  let stopped = false;
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
    });
  }
  process.stdout.write("\x1b[?1049h\x1b[?25lLoading AI usage…\n");
  async function tick() {
    let output;
    try {
      output = formatTable(await refresh());
    } catch (error) {
      output = colorize(singleLine(error.message), "red");
    }
    if (stopped) return;
    process.stdout.write(`\x1b[H\x1b[2J${output}\n`);
    timer = setTimeout(tick, 5000);
  }
  await tick();
}

if (import.meta.main) {
  await main().catch((error) => {
    console.error(`aiusage: ${singleLine(error.message)}`);
    process.exitCode = 1;
  });
}
