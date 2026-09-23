import { $ } from "bun";
import { join } from "node:path";
import { home } from "./env";
import { exists } from "./fs";

/**
 * Grant the Codex sandbox user read and execute access to `~/.ignore` and the
 * nvim mason and repo `dist` tool directories.
 */
export async function grantCodexSandboxPermissions() {
  if (process.platform !== "win32" || !Bun.which("codex")) return [];

  const granted = [];

  const ignorePath = join(home(), ".ignore");
  if (await exists(ignorePath)) {
    await $`icacls ${ignorePath} /grant CodexSandboxUsers:R`;
    await $`icacls ${ignorePath} /L /grant CodexSandboxUsers:R`;
    granted.push(ignorePath);
  }

  const localAppData = process.env.LOCALAPPDATA || join(home(), "AppData", "Local");
  const toolDirectories = [
    join(localAppData, "nvim-data", "mason"),
    join(process.cwd(), "dist"),
  ];
  for (const directory of toolDirectories) {
    if (!(await exists(directory))) continue;

    await $`icacls ${directory} /grant "CodexSandboxUsers:(OI)(CI)(RX)" /T`.quiet();
    console.log(`Granted Codex read and execute access to ${directory}`);
    granted.push(directory);
  }

  return granted;
}
