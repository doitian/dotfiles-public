import { constants } from "node:os";

export function spawnSyncOrExit(...args) {
  const r = Bun.spawnSync(args, { stdio: ["inherit", "inherit", "inherit"] });
  if (!r.success) {
    process.exit(r.exitCode ?? 128 + (constants.signals[r.signalCode] ?? 0));
  }
}
