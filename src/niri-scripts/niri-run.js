#!/usr/bin/env bun
/**
 * Prompt for a command with rofi, then have niri run it detached through `sh -c`.
 */

import { $ } from "bun";

const prompt = "$ ";
const answer = await $`rofi -dmenu -l 0 -p ${prompt} < ${new Response("")}`.nothrow().quiet();
const command = answer.exitCode === 0 ? answer.text().trim() : "";
if (command) {
  const result = await $`niri msg action spawn-sh -- ${command}`.nothrow().quiet();
  if (result.exitCode !== 0) {
    const message = result.stderr.toString().trim() || `niri exited with ${result.exitCode}`;
    console.error(`niri-run: ${message}`);
    await $`notify-send niri-run ${message}`.nothrow().quiet();
    process.exit(1);
  }
}
