#!/usr/bin/env bun
import { $ } from "bun";
import { claimProgress, duringSlice, finishProgress, slices } from "../lib/progress";

async function updateClaude() {
  await $`claude plugin marketplace update`;
  const plugins = JSON.parse(await $`claude plugin list --json`.text());
  for (const plugin of plugins.filter((p) => p.scope === "user")) {
    await $`claude plugin update ${plugin.id}`;
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

if (import.meta.main) {
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
