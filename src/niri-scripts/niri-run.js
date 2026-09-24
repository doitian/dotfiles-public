#!/usr/bin/env bun
/**
 * Prompt for a command with rofi, then run it via shell
 */

import { $ } from "bun";

const prompt = "$ ";
const command = (await $`rofi -dmenu -l 0 -p ${prompt} < ${new Response("")}`.nothrow().text()).trim();
if (command) {
  await $`${{ raw: command }}`;
}
