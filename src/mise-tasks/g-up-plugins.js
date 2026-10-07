#!/usr/bin/env bun
import { $ } from "bun";

async function updateClaude() {
  await $`claude plugin marketplace update`;
  const plugins = JSON.parse(await $`claude plugin list --json`.text());
  for (const plugin of plugins.filter((p) => p.scope === "user")) {
    await $`claude plugin update ${plugin.id}`;
  }
}

const updaters = {
  pi: () => $`pi update --extensions --no-approve`,
  opencode: () => $`opencode plugin update`,
  claude: updateClaude,
};

const failed = [];
for (const [cmd, update] of Object.entries(updaters)) {
  if (!Bun.which(cmd)) continue;
  try {
    await update();
  } catch (err) {
    failed.push(cmd);
    console.error(`${cmd} plugin update failed:`, err.stderr?.toString() || err.message);
  }
}
if (failed.length) {
  console.error(`Plugin updates failed for: ${failed.join(", ")}`);
  process.exit(1);
}
