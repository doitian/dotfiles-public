#!/usr/bin/env bun
import { $ } from "bun";
import {
  claimProgress,
  clearProgress,
  DEFAULT_STEP_MS,
  duringSlice,
  finishProgress,
  holdProgress,
  slices,
} from "./lib/progress";

const usage = "usage: osc-progress [i/n] command [arg ...]";

export function parseInvocation(args) {
  if (args.length === 0) return { clear: true };
  const match = /^(\d+)\/(\d+)$/.exec(args[0]);
  if (!match) return { index: 0, count: 1, command: args };
  const step = Number(match[1]);
  const count = Number(match[2]);
  if (count < 1 || step < 1 || step > count || args.length < 2) {
    throw new Error(step > count || count < 1 || step < 1 ? `invalid step ${args[0]}` : usage);
  }
  return { index: step - 1, count, command: args.slice(1) };
}

export async function run(args) {
  const parsed = parseInvocation(args);
  if (parsed.clear) {
    clearProgress();
    return 0;
  }
  const owned = claimProgress();
  const result = owned
    ? await runOwned(parsed)
    : await $`${parsed.command}`.nothrow();
  return result?.exitCode ?? result ?? 1;
}

async function runOwned({ index, count, command }) {
  let code = 1;
  await duringSlice(slices(Array(count).fill(DEFAULT_STEP_MS))[index], async () => {
    const result = await $`${command}`.nothrow();
    code = result.exitCode ?? 1;
  });
  if (code !== 0) finishProgress(false);
  else if (index === count - 1) finishProgress(true);
  else holdProgress(((index + 1) / count) * 100);
  return code;
}

if (import.meta.main) {
  try {
    process.exit(await run(process.argv.slice(2)));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
