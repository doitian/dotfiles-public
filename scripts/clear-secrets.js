#!/usr/bin/env bun
/**
 * Clear stored credentials by category. No args clears all categories.
 */
import { secrets } from "bun";
import { SERVICE_NAME } from "../src/lib/secrets.js";
import { GOOGLE_TASKS_SECRETS } from "../src/gtasks.js";

export const CATEGORIES = {
  "google-tasks": GOOGLE_TASKS_SECRETS,
  openai: ["openai-api-key", "openai-base-url", "openai-model"],
  pushover: [
    "pushover-user-key",
    "pushover-personal-token",
    "pushover-agent-token",
    "pushover-desktop-notification-token",
  ],
};

export const SECRET_NAMES = Object.values(CATEGORIES).flat();

if (import.meta.main) {
  function usage() {
    process.stderr.write(
      "Usage: bun run clear-secrets [openai|pushover|google-tasks]\n  No args = clear all categories.\n",
    );
    process.exit(1);
  }

  const arg = process.argv[2];
  let names;
  if (arg === undefined) {
    names = SECRET_NAMES;
  } else if (Object.hasOwn(CATEGORIES, arg)) {
    names = CATEGORIES[arg];
  } else {
    usage();
  }

  for (const name of names) {
    const deleted = await secrets.delete({
      service: SERVICE_NAME,
      name,
    });
    console.log(deleted ? `Deleted: ${name}` : `Not found: ${name}`);
  }
}
