#!/usr/bin/env bun
/**
 * Prompt for a command with fuzzel, then run it via shell
 */

import { $ } from "bun";

const prompt = "$ ";
const command = (await $`fuzzel -d -l 0 -w 100 --prompt ${prompt}`.nothrow().text()).trim();
if (command) {
  await $`${{ raw: command }}`;
}
