#!/usr/bin/env bun
/**
 * Prompt for a workspace name with rofi, then set or unset the current niri workspace name.
 * Cancelling the prompt leaves the name unchanged; submitting empty input unsets it.
 */

import { $ } from "bun";

const prompt = " ";
const result = await $`rofi -dmenu -l 0 -p ${prompt} < ${new Response("")}`.nothrow().quiet();
if (result.exitCode === 0) {
  const name = result.text().trim();
  if (name) {
    await $`niri msg action set-workspace-name ${name}`;
  } else {
    await $`niri msg action unset-workspace-name`;
  }
}
