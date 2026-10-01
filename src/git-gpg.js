#!/usr/bin/env bun
/**
 * gpg.program for git. gpg-agent serves one pinentry at a time. Load the
 * signing passphrase from gopass before pinentry starts, preset it, then run
 * the real gpg. On Windows and WSL this talks to gpg.exe so the preset hits
 * the same agent that will sign.
 */
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { $ } from "bun";

const entryPrefix = process.env.GIT_GPG_GOPASS_PREFIX || "ids/ian/gpg";

export function gpgArgs(argv) {
  const second = (argv[1] ?? "").replaceAll("\\", "/");
  if (/(?:^|\/)git-gpg(?:\.js)?$/.test(second)) return argv.slice(2);
  return argv.slice(1);
}

export function parseSignArgs(args) {
  let isSign = false;
  let expectUser = false;
  let key = "";
  for (const arg of args) {
    if (expectUser) {
      key = arg;
      expectUser = false;
      continue;
    }
    if (arg === "--local-user") {
      expectUser = true;
      continue;
    }
    if (arg.startsWith("--local-user=")) {
      key = arg.slice("--local-user=".length);
      continue;
    }
    if (arg === "--sign" || arg === "--clearsign" || arg === "--detach-sign") {
      isSign = true;
      continue;
    }
    if (arg.startsWith("--")) continue;
    if (arg.startsWith("-") && arg.length > 1) {
      const flags = arg.slice(1);
      if (flags.includes("s")) isSign = true;
      if (flags.includes("u")) expectUser = true;
    }
  }
  return { isSign, key };
}

export function parseIdentity(colonText, keyId) {
  const id = keyId.replace(/!$/, "");
  let fpr = "";
  let grip = "";
  let email = "";
  for (const line of colonText.split(/\r?\n/)) {
    const fields = line.split(":");
    if (fields[0] === "fpr") fpr = fields[9] ?? "";
    else if (fields[0] === "grp") {
      if (fpr === id || (id && fpr.endsWith(id))) grip = fields[9] ?? "";
    } else if (fields[0] === "uid" && !email) {
      const match = (fields[9] ?? "").match(/<([^>]+)>/);
      if (match) email = match[1];
    }
  }
  if (!grip || !email) return null;
  return { grip, email };
}

export function cachedFromKeyinfo(text, grip) {
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "S" && parts[1] === "KEYINFO" && parts[2] === grip) return parts[6] === "1";
  }
  return false;
}

export function preferGpg(paths) {
  return paths.find((p) => /(?:^|[\\/])gnupg[\\/]/i.test(p) || /gpg4win/i.test(p)) || paths[0] || "";
}

export function findOnPath(pathEnv, names, exists = existsSync, sep = pathSep()) {
  const found = [];
  for (const dir of pathEnv.split(sep).filter(Boolean)) {
    for (const name of names) {
      const full = join(dir, name);
      if (exists(full)) found.push(full);
    }
  }
  return found;
}

export function siblingTool(gpgPath, baseName) {
  const exe = gpgPath.toLowerCase().endsWith(".exe");
  return join(dirname(gpgPath), exe ? `${baseName}.exe` : baseName);
}

function pathSep(platform = process.platform) {
  return platform === "win32" ? ";" : ":";
}

function useWindowsGpg(env = process.env, platform = process.platform) {
  return platform === "win32" || Boolean(env.WSLENV);
}

function stripTrailingNewline(text) {
  return text.replace(/\r?\n$/, "");
}

function resolveGpg(env = process.env, platform = process.platform, exists = existsSync) {
  if (env.GIT_GPG_REAL) return env.GIT_GPG_REAL;
  const names = useWindowsGpg(env, platform) ? ["gpg.exe", "gpg"] : ["gpg"];
  return preferGpg(findOnPath(env.PATH ?? "", names, exists, pathSep(platform)));
}

function resolveCompanion(gpgPath, baseName, env, exists = existsSync) {
  const override = baseName === "gopass" ? env.GIT_GPG_GOPASS : env.GIT_GPG_CONNECT_AGENT;
  if (override) return override;
  const sibling = siblingTool(gpgPath, baseName);
  if (exists(sibling)) return sibling;
  const names = gpgPath.toLowerCase().endsWith(".exe") ? [`${baseName}.exe`, baseName] : [baseName];
  return preferGpg(findOnPath(env.PATH ?? "", names, exists, pathSep())) || names[0];
}

async function agentVisiblePath(file, gpgPath) {
  if (process.platform !== "win32" && gpgPath.toLowerCase().endsWith(".exe")) {
    const converted = await $`wslpath -w ${file}`.quiet().nothrow();
    if (converted.exitCode === 0) return converted.text().trim();
  }
  return file;
}

async function presetPassphrase(connectAgent, grip, pass, gpgPath) {
  const dir = await mkdtemp(join(tmpdir(), "git-gpg-"));
  const file = join(dir, "pass");
  try {
    await writeFile(file, pass, { mode: 0o600 });
    const agentPath = await agentVisiblePath(file, gpgPath);
    const definq = `/definqfile PASSPHRASE ${agentPath}`;
    const preset = `PRESET_PASSPHRASE --inquire ${grip} -1`;
    const result = await $`${connectAgent} ${definq} ${preset} /bye`.quiet().nothrow();
    const text = `${result.stdout.toString()}${result.stderr.toString()}`;
    return result.exitCode === 0 && !text.includes("ERR ") && text.includes("OK");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function presetFromGopass(gpg, connectAgent, gopass, key) {
  const listed = await $`${gpg} --batch --with-colons --with-keygrip -K ${key}`.quiet().nothrow();
  const identity = listed.exitCode === 0 ? parseIdentity(listed.stdout.toString(), key) : null;
  if (!identity) return;
  const info = await $`${connectAgent} ${`KEYINFO ${identity.grip}`} /bye`.quiet().nothrow();
  if (cachedFromKeyinfo(info.stdout.toString(), identity.grip)) return;
  const entry = `${entryPrefix}/${identity.email}`;
  const shown = await $`${gopass} show -o ${entry}`.quiet().nothrow();
  if (shown.exitCode !== 0) {
    const err = shown.stderr.toString().trim();
    if (err) console.error(err);
    console.error(`git-gpg: gopass show ${entry} failed`);
    process.exit(1);
  }
  const pass = stripTrailingNewline(shown.stdout.toString());
  if (!pass) {
    console.error(`git-gpg: empty passphrase from ${entry}`);
    process.exit(1);
  }
  if (!(await presetPassphrase(connectAgent, identity.grip, pass, gpg))) {
    console.error("git-gpg: could not preset passphrase (gpg-agent needs allow-preset-passphrase)");
  }
}

async function main() {
  const args = gpgArgs(process.argv);
  const gpg = resolveGpg();
  if (!gpg) {
    console.error("git-gpg: gpg not found");
    process.exit(1);
  }
  const { isSign, key } = parseSignArgs(args);
  if (isSign && key && !process.env.GIT_GPG_NO_UNLOCK) {
    const connectAgent = resolveCompanion(gpg, "gpg-connect-agent", process.env);
    const gopass = resolveCompanion(gpg, "gopass", process.env);
    await presetFromGopass(gpg, connectAgent, gopass, key);
  }
  const child = Bun.spawn([gpg, ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(await child.exited ?? 1);
}

if (import.meta.main || Bun.isStandaloneExecutable) {
  main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
