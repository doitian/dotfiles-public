import { constants } from "node:os";

export function posixQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

export function spawnSyncOrExit(...args) {
  const r = Bun.spawnSync(args, { stdio: ["inherit", "inherit", "inherit"] });
  if (!r.success) {
    process.exit(r.exitCode ?? 128 + (constants.signals[r.signalCode] ?? 0));
  }
}

export async function spawnOrExit(...args) {
  const proc = Bun.spawn(args, { stdio: ["inherit", "inherit", "inherit"] });
  await proc.exited;
  if (proc.exitCode !== 0) {
    process.exit(proc.exitCode ?? 128 + (constants.signals[proc.signalCode] ?? 0));
  }
}
