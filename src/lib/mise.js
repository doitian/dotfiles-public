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
    return await $`mise env -J`.nothrow().json();
  } catch {
    return {};
  }
}

export async function getMisePathEntries(configRoot) {
  try {
    const result = await $`mise config get env._.path`.nothrow().quiet();
    if (result.exitCode !== 0 || !result.stdout) return [];
    const raw = result.stdout.toString().trim();
    if (!raw) return [];
    let entries;
    try {
      entries = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(entries)) return [];
    return entries.map((e) =>
      String(e).replaceAll("{{config_root}}", configRoot),
    );
  } catch {
    return [];
  }
}
