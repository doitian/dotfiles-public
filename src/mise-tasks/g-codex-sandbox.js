#!/usr/bin/env bun
import { grantCodexSandboxPermissions } from "../lib/codex-sandbox";

async function main() {
  const granted = await grantCodexSandboxPermissions();
  if (granted.length === 0) {
    console.log("No Codex sandbox permissions to grant");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
