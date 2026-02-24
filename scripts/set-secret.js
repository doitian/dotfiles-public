#!/usr/bin/env bun
/**
 * Set a single secret. Run: bun run set-secret
 */
import { secrets, } from "bun";
import { SERVICE_NAME } from "../src/lib/secrets.js";
import { SECRET_NAMES } from "./clear-secrets.js";

function exit(message) {
  console.error(message);
  console.error(`Secret names:\n  ${SECRET_NAMES.join("\n  ")}`);
  process.exit(1);
}

if (Bun.argv.length <= 2) {
  exit("Usage: bun run set-secret [secret-name] [secret-value]");
}

if (!SECRET_NAMES.includes(Bun.argv[2])) {
  exit(`Unknown secret name ${Bun.argv[2]}`);
}

await secrets.set({ service: SERVICE_NAME, name: Bun.argv[2], value: Bun.argv[3] });
