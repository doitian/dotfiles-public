#!/usr/bin/env bun
/**
 * Prompt for a workspace name with fuzzel, then set or unset the current niri workspace name.
 */

import { $ } from "bun";

const prompt = " ";
const name = (await $`fuzzel -d -l 0 --prompt ${prompt}`.nothrow().text()).trim();
if (name) {
  await $`niri msg action set-workspace-name ${name}`;
} else {
  await $`niri msg action unset-workspace-name`;
}