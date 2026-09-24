#!/usr/bin/env bun
/**
 * Prompt for a workspace name with rofi, then set or unset the current niri workspace name.
 */

import { $ } from "bun";

const prompt = " ";
const name = (await $`rofi -dmenu -l 0 -p ${prompt} < ${new Response("")}`.nothrow().text()).trim();
if (name) {
  await $`niri msg action set-workspace-name ${name}`;
} else {
  await $`niri msg action unset-workspace-name`;
}