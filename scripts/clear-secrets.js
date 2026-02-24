#!/usr/bin/env bun
/**
 * Clear ian-bin secrets by category. Run: bun run clear-secrets [openai|pushover]
 * No args = clear all. openai = OpenAI secrets only. pushover = Pushover secrets only.
 */
import { secrets } from "bun";
import { SERVICE_NAME } from "../src/lib/secrets.js";

export const CATEGORIES = {
  openai: ["openai-api-key", "openai-base-url", "openai-model"],
  pushover: [
    "pushover-user-key",
    "pushover-personal-token",
    "pushover-agent-token",
  ],
};

export const SECRET_NAMES = [...CATEGORIES.openai, ...CATEGORIES.pushover];

if (import.meta.main) {
  function usage() {
    process.stderr.write(
      "Usage: bun run clear-secrets [openai|pushover]\n  No args = clear all. openai = OpenAI only. pushover = Pushover only.\n",
    );
    process.exit(1);
  }

  const arg = process.argv[2];
  let names;
  if (arg === undefined) {
    names = SECRET_NAMES;
  } else if (arg === "openai") {
    names = CATEGORIES.openai;
  } else if (arg === "pushover") {
    names = CATEGORIES.pushover;
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
