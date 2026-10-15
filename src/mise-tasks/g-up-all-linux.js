#!/usr/bin/env bun
import { runSteps } from "../lib/progress";
import { spawnOrExit } from "../lib/shell";

function step(args, estimateMs) {
  return { args, estimateMs };
}

export function updatePlan(which = (cmd) => Bun.which(cmd)) {
  const steps = [];
  if (which("apt")) {
    steps.push(step(["sudo", "apt", "update"], 15_000));
    steps.push(step(["sudo", "apt", "upgrade", "-y"], 90_000));
  }
  if (which("brew")) {
    steps.push(step(["brew", "update"], 20_000));
    steps.push(step(["brew", "upgrade", "-y"], 90_000));
  }
  if (which("paru")) {
    steps.push(step(["paru", "-Syu"], 120_000));
  } else if (which("pacman")) {
    steps.push(step(["sudo", "pacman", "-Syu"], 90_000));
  }
  if (which("uv")) steps.push(step(["mise", "run", "g:up:uv"], 30_000));
  if (which("bun")) steps.push(step(["mise", "run", "g:up:bun"], 20_000));
  if (which("pi") || which("opencode") || which("claude")) {
    steps.push(step(["mise", "run", "g:up:plugins"], 45_000));
  }
  return steps;
}

if (import.meta.main || Bun.isStandaloneExecutable) {
  await runSteps(updatePlan().map(({ args, estimateMs }) => ({ estimateMs, run: () => spawnOrExit(...args) })));
}
