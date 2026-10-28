#!/usr/bin/env bun
import { $ } from "bun";
import { claimProgress, duringSlice, finishProgress, slices } from "../lib/progress";

// Claude probes SSH with `ssh -T ... git@github.com` and a 3s timeout before
// cloning GitHub marketplaces. With gpg-agent's SSH support that starts a
// smartcard pinentry, which the probe then kills before it can be answered.
// Prefer HTTPS so the probe is skipped.
export function claudePluginEnv(env = process.env) {
  return { ...env, CLAUDE_CODE_PLUGIN_PREFER_HTTPS: "1" };
}

async function updateClaude() {
  const env = claudePluginEnv();
  await $`claude plugin marketplace update`.env(env);
  const plugins = JSON.parse(await $`claude plugin list --json`.env(env).text());
  for (const plugin of plugins.filter((p) => p.scope === "user")) {
    await $`claude plugin update ${plugin.id}`.env(env);
  }
}

const updaters = {
  pi: { estimateMs: 20_000, run: () => $`pi update --extensions --no-approve` },
  opencode: { estimateMs: 20_000, run: () => $`opencode plugin update` },
  claude: { estimateMs: 45_000, run: updateClaude },
};

export function pluginCommands(which = (cmd) => Bun.which(cmd)) {
  return Object.keys(updaters).filter((cmd) => which(cmd));
}

if (import.meta.main || Bun.isStandaloneExecutable) {
  const cmds = pluginCommands();
  if (cmds.length === 0) process.exit(0);
  claimProgress();
  const ranges = slices(cmds.map((cmd) => updaters[cmd].estimateMs));
  const failed = [];
  for (let i = 0; i < cmds.length; i++) {
    try {
      await duringSlice(ranges[i], () => updaters[cmds[i]].run());
    } catch (err) {
      failed.push(cmds[i]);
      console.error(`${cmds[i]} plugin update failed:`, err.stderr?.toString() || err.message);
    }
  }
  if (failed.length) {
    console.error(`Plugin updates failed for: ${failed.join(", ")}`);
    finishProgress(false);
    process.exit(1);
  }
  finishProgress(true);
}
