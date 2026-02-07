#!/usr/bin/env bun
/**
 * Set a single ian-bin secret. Run: bun run set-secret <key> <value>
 */
import { secrets } from "bun";
import { SERVICE_NAME } from "../src/lib/secrets.js";
import { SECRET_NAMES } from "./clear-secrets.js";

const key = process.argv[2];
const value = process.argv.slice(3).join(" ");

if (key === undefined || process.argv.length < 4) {
    process.stderr.write("Usage: bun run set-secret <key> <value>\n");
    process.stderr.write("Secret names:\n");
    for (const name of SECRET_NAMES) {
        process.stderr.write(`  ${name}\n`);
    }
    process.exit(1);
}

await secrets.set({
    service: SERVICE_NAME,
    name: key,
    value,
});
console.log(`Set: ${key}`);
