#!/usr/bin/env bun
import { runSteps } from "../lib/progress";
import { spawnOrExit } from "../lib/shell";

function step(args, estimateMs) {
  return { args, estimateMs };
}

export function updatePlan(which = (cmd) => Bun.which(cmd)) {
  const steps = [];
  if (which("scoop")) steps.push(step(["scoop", "update", "-a"], 60_000));
  if (which("uv")) steps.push(step(["mise", "run", "g:up:uv"], 30_000));
  if (which("bun")) steps.push(step(["mise", "run", "g:up:bun"], 20_000));
  if (which("pi") || which("opencode") || which("claude")) {
    steps.push(step(["mise", "run", "g:up:plugins"], 45_000));
  }
  return steps;
}

if (import.meta.main) {
  await runSteps(updatePlan().map(({ args, estimateMs }) => ({ estimateMs, run: () => spawnOrExit(...args) })));
}
