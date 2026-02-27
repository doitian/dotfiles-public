import { dirname } from "node:path";
import { $ } from "bun";

export async function getMiseShimsPath() {
  const miseBin = Bun.which("mise");
  if (!miseBin) return null;
  const re = /^fish_add_path\s+.*\s+(?:'([^']+)'|(\S+))$/;
  for await (const line of $`mise activate fish --shims`
    .env({ PATH: dirname(miseBin) })
    .nothrow()
    .lines()) {
    const m = line.match(re);
    if (m) {
      const path = m[1] || m[2] || "";
      if (path.includes("shims")) return path;
    }
  }
  return null;
}

export async function getMiseEnv() {
  try {
    const stdout = await $`mise env -J`.text().nothrow();
    if (!stdout.trim()) return {};
    return JSON.parse(stdout.trim());
  } catch {
    return {};
  }
}
