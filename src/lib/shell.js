import { constants } from "node:os";

export function posixQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

// Bun.spawn defaults to the environment captured at startup, so pass process.env
// explicitly to forward runtime changes such as OSC_PROGRESS_OWNER to children.
export function spawnSyncOrExit(...args) {
  const r = Bun.spawnSync(args, { stdio: ["inherit", "inherit", "inherit"], env: process.env });
  if (!r.success) {
    process.exit(r.exitCode ?? 128 + (constants.signals[r.signalCode] ?? 0));
  }
}

export async function spawnOrExit(...args) {
  const proc = Bun.spawn(args, { stdio: ["inherit", "inherit", "inherit"], env: process.env });
  await proc.exited;
  if (proc.exitCode !== 0) {
    process.exit(proc.exitCode ?? 128 + (constants.signals[proc.signalCode] ?? 0));
  }
}
