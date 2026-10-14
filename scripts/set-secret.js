#!/usr/bin/env bun
/**
 * Set a single secret, reading the value from stdin so it stays out of argv and shell history.
 * Run: bun run set-secret <secret-name>, or pipe the value in.
 */
import { secrets } from "bun";
import { readHidden } from "../src/lib/io.js";
import { SERVICE_NAME } from "../src/lib/secrets.js";
import { SECRET_NAMES } from "./clear-secrets.js";

function exit(message) {
  console.error(message);
  console.error(`Secret names:\n  ${SECRET_NAMES.join("\n  ")}`);
  process.exit(1);
}

const name = Bun.argv[2];
if (!name || Bun.argv.length > 3) {
  exit("Usage: bun run set-secret <secret-name> (value is read from stdin)");
}
if (!SECRET_NAMES.includes(name)) {
  exit(`Unknown secret name ${name}`);
}

const value = process.stdin.isTTY
  ? await readHidden(`Value for ${name}: `)
  : (await Bun.stdin.text()).replace(/\r?\n$/, "");
if (!value) {
  exit(`No value provided for ${name}`);
}

await secrets.set({ service: SERVICE_NAME, name, value });
