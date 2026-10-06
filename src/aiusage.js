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

function colorize(text, color, force = false) {
  let prefix = Bun.color(color, force ? "ansi-16m" : "ansi");
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

function windowMs(limit) {
  return {
    five_hour: 5 * 3600000,
    rolling: 5 * 3600000,
    seven_day: 7 * 86400000,
    seven_day_fable: 7 * 86400000,
    weekly: 7 * 86400000,
    monthly: 30 * 86400000,
  }[limit];
}

const SHORT_LIMITS = new Set(["five_hour", "rolling"]);
const ACTION_RANK = { "↓": 0, "↑": 1 };

// Remaining usage over remaining time: below 1× runs out before the reset, above 1× leaves quota unused.
function usagePace(settings, usage, now) {
  const duration = windowMs(settings.limit);
  const reset = Date.parse(usage.resets_at);
  if (!duration || !Number.isFinite(usage.remaining_percent) || !Number.isFinite(reset) || reset <= now) return null;
  const time = Math.min(1, (reset - now) / duration);
  const pace = Math.round(Math.max(0, Math.min(100, usage.remaining_percent)) / time / 10) / 10;
  const action = pace < 1 ? "↓" : pace >= 1.5 && !SHORT_LIMITS.has(settings.limit) ? "↑" : "";
  return { pace, action };
}

function bankedResets(account) {
  const count = account?.reset_credits;
  if (!Number.isInteger(count) || count <= 0) return {};
  return { reset_credits: count, reset_expiries: Array.isArray(account.reset_expiries) ? account.reset_expiries : [] };
}

// Mirrors the Ulanzi 7d keys, which are the only ones that show banked resets.
function bankedExpiry(settings, usage) {
  const count = usage.reset_credits;
  if (settings.limit !== "seven_day" || !Number.isInteger(count) || count <= 0) return null;
  return { count, expiry: Math.min(...(usage.reset_expiries ?? []).slice(0, count).map(Date.parse).filter(Number.isFinite)) };
}

function bankedCell(banked, now, paint) {
  if (!banked) return "-";
  if (!Number.isFinite(banked.expiry)) return String(banked.count);
  const days = (banked.expiry - now) / 86400000;
  const text = resetTime(new Date(banked.expiry).toISOString(), now);
  return `${banked.count} (${days <= 7 ? paint(text, days <= 3 ? "red" : "yellow") : text})`;
}

function formatRow(instance, now, showBanked, color, accounts) {
  const settings = instance.settings ?? {};
  const usage = instance.usage ?? {};
  const provider = settings.label || settings.provider || "unknown";
  const account = settings.account ? ` [account ${accounts.get(String(settings.account).trim().toLowerCase())}]` : "";
  const limit = LIMITS[settings.limit] ?? settings.limit ?? "usage";
  const pace = usagePace(settings, usage, now);
  const banked = bankedExpiry(settings, usage);
  // On-pace rows fade out unless a banked reset is about to expire.
  const dim = Boolean(pace && !pace.action && !(banked?.expiry - now <= 7 * 86400000));
  const paint = (text, name) => dim ? text : colorize(text, name, color);
  let value;
  if (typeof usage.remaining_percent === "number" && Number.isFinite(usage.remaining_percent)) {
    const percent = usage.remaining_percent;
    value = paint(`${Number(percent.toFixed(1))}%`, percent <= 20 ? "red" : percent <= 50 ? "orange" : "green");
  } else if (typeof usage.remaining_amount === "number" && Number.isFinite(usage.remaining_amount)) {
    const amount = usage.remaining_amount;
    value = paint(`${amount.toFixed(2)} ${singleLine(usage.currency || "")}`.trim(), amount <= 0 ? "red" : "green");
  } else {
    value = "-";
  }
  const reset = usage.resets_at ? resetTime(usage.resets_at, now) : "-";
  let paceCell = "-";
  if (pace) {
    const text = `${(pace.pace >= 10 ? ">9" : pace.pace.toFixed(1)).padStart(3)}×`;
    paceCell = pace.action ? paint(`${text} ${pace.action}`, pace.action === "↑" ? "blue" : "red") : text;
  }
  const cells = [`${singleLine(provider)}${account}`, singleLine(limit), value, reset, paceCell];
  if (showBanked) cells.push(bankedCell(banked, now, paint));
  return { cells, dim, pace: pace?.pace, rank: ACTION_RANK[pace?.action] ?? 2 };
}

export function formatTable(instances, now = Date.now(), { color = false } = {}) {
  if (!instances.length) return "No AI usage buttons found.";
  const showBanked = instances.some((instance) => bankedExpiry(instance.settings ?? {}, instance.usage ?? {}));
  const header = ["Provider", "Limit", "Remaining", "Resets in", "Pace", ...(showBanked ? ["Banked"] : [])];
  const accounts = new Map();
  for (const instance of instances) {
    const account = instance.settings?.account;
    if (!account) continue;
    const key = String(account).trim().toLowerCase();
    if (!accounts.has(key)) accounts.set(key, accounts.size + 1);
  }
  const rows = instances.map((instance) => formatRow(instance, now, showBanked, color, accounts))
    .sort((a, b) => a.rank - b.rank
      || (a.rank === 0 ? a.pace - b.pace : a.rank === 1 ? b.pace - a.pace : 0)
      || a.cells[0].localeCompare(b.cells[0], undefined, { sensitivity: "base" })
      || (LIMIT_ORDER[a.cells[1]] ?? 4) - (LIMIT_ORDER[b.cells[1]] ?? 4));
  const widths = header.map((_, column) =>
    Math.max(...[header, ...rows.map((row) => row.cells)].map((cells) => Bun.stringWidth(cells[column]))));
  const line = (cells) => cells.map((cell, column) => {
    const padding = " ".repeat(widths[column] - Bun.stringWidth(cell));
    return column === 2 ? padding + cell : cell + padding;
  }).join("  ").trimEnd();
  return [line(header), ...rows.map((row) => row.dim ? colorize(line(row.cells), "gray", color) : line(row.cells))].join("\n");
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
  const response = await fetch(`http://127.0.0.1:${port}/usage/fetch`, {
    headers: { "X-Ulanzi-Bridge": "1" },
    signal: AbortSignal.timeout(3000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Ulanzi bridge returned HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data?.instances)) throw new Error("Ulanzi bridge returned no instances array");
  return data.instances;
}

async function refreshUsage(port) {
  const response = await fetch(`http://127.0.0.1:${port}/usage/refresh`, {
    method: "POST",
    headers: { "X-Ulanzi-Bridge": "1" },
    signal: AbortSignal.timeout(65000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Ulanzi refresh returned HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.providers || typeof data.providers !== "object" || Array.isArray(data.providers)
    || !Number.isFinite(data.fetchedAt)) {
    throw new Error("Ulanzi refresh returned invalid provider data");
  }
  return data;
}

function refreshedInstances(instances, data) {
  return instances.map((instance) => {
    if (!data || instance.fetchedAt >= data.fetchedAt) return instance;
    const settings = instance.settings ?? {};
    const provider = data.providers[settings.provider || "codex"];
    const email = (settings.account || "").trim().toLowerCase();
    const account = Array.isArray(provider?.accounts)
      ? provider.accounts.find((row) => email ? (row.email || "").toLowerCase() === email : row.active === true)
      || (provider.accounts.length === 1 && !provider.accounts[0].email ? provider.accounts[0] : null)
      : (!email || (provider?.email || "").toLowerCase() === email ? provider : null);
    const limit = !provider?.error && !account?.error && account?.limits?.[settings.limit || "five_hour"];
    let usage = {};
    if (Number.isFinite(limit?.remaining_amount)) {
      usage = { remaining_amount: limit.remaining_amount, currency: limit.currency };
    } else if (Number.isFinite(limit?.remaining_percent) || Number.isFinite(limit?.used_percent)) {
      const remaining = Number.isFinite(limit.remaining_percent) ? limit.remaining_percent : 100 - limit.used_percent;
      usage = { remaining_percent: Math.max(0, Math.min(100, remaining)), resets_at: limit.resets_at, ...bankedResets(account) };
    }
    return { ...instance, usage, fetchedAt: data.fetchedAt };
  });
}

export async function createUsageReader(cachePath, discoverPorts = findPorts) {
  const cached = await Bun.file(cachePath).json().catch(() => null);
  let port = Number.isInteger(cached) && cached > 0 && cached <= 65535 ? cached : undefined;
  let freshUsage;
  async function read() {
    if (port) {
      try {
        return await readInstances(port);
      } catch {
        port = undefined;
        freshUsage = undefined;
        await unlink(cachePath).catch(() => { });
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
        } catch { }
        return instances;
      } catch (error) {
        errors.push(`${candidate}: ${error.message}`);
      }
    }
    throw new Error(`Could not read Ulanzi usage (${errors.join("; ")})`);
  }
  return async function refresh(force = false) {
    const instances = await read();
    if (force) freshUsage = await refreshUsage(port);
    // Widget snapshots can lag the provider refresh by one minute.
    return refreshedInstances(instances, freshUsage);
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
        instances.push({ settings: { ...settings, limit }, usage: { ...usage, ...bankedResets(account) } });
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
      color: { type: "boolean" },
      refresh: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(`Usage: aiusage [--once] [--refresh] [--color]

Show Ulanzi AI usage, updating every 5 seconds. Press r to refresh, q or Ctrl+C to quit.
Account identifiers are redacted as numbered aliases.
--once     Print one snapshot (also used when stdout is redirected).
--refresh  Request fresh provider data on launch.
--color    Force color output, even when stdout is redirected.
Pace is remaining usage divided by remaining time on 5h (including rolling), 7d, and 30d monthly windows.
Below 1× is a red ↓ (slow down); 1.5× or more on 7d and monthly windows is a blue ↑ (use it). Those rows sort
to the top, other rows with a pace are dimmed, and balances and rows without a reset show -.
Banked lists Claude and Codex 7d limit resets in reserve and the time until the earliest expires
(red within 3d, yellow within 7d); the column appears only when some account has one.
Windows: Ulanzi Studio AI usage plugin. Linux: ulanzi-niri ai-usage --json.`);
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
    console.log(formatTable(await refresh(values.refresh), Date.now(), values));
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
        else force = true;
      }
      output = formatTable(await refresh(force), Date.now(), values);
    } catch (error) {
      output = colorize(singleLine(error.message), "red", values.color);
    }
    loading = false;
    if (stopped) return;
    process.stdout.write(`\x1b[H\x1b[2J${output}\n\nr refresh · q quit\n`);
    timer = setTimeout(tick, refreshRequested ? 0 : 5000);
  }
  await tick(values.refresh);
}

if (import.meta.main || Bun.isStandaloneExecutable) {
  await main().catch((error) => {
    console.error(`aiusage: ${singleLine(error.message)}`);
    process.exitCode = 1;
  });
}
