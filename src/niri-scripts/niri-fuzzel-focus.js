#!/usr/bin/env bun
/**
 * List niri windows via JSON, present in fuzzel, focus the selected window.
 */

import { $ } from "bun";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DESKTOP_DIRS = [
  join(process.env.HOME, ".local/share/applications"),
  "/usr/share/applications",
];

const iconCache = new Map();

function findIcon(appId) {
  if (!appId) return "";
  const key = appId.toLowerCase();
  if (iconCache.has(key)) return iconCache.get(key);

  for (const dir of DESKTOP_DIRS) {
    try {
      const content = readFileSync(join(dir, `${key}.desktop`), "utf8");
      const match = content.match(/^Icon=(.+)$/m);
      if (match) {
        iconCache.set(key, match[1]);
        return match[1];
      }
    } catch {
      continue;
    }
  }
  iconCache.set(key, key);
  return key;
}

const windows = await $`niri msg --json windows`.json();
windows.sort((a, b) => {
  if (a.workspace_id !== b.workspace_id) return a.workspace_id - b.workspace_id;
  const aCol = a.layout?.pos_in_scrolling_layout?.[1] ?? 0;
  const bCol = b.layout?.pos_in_scrolling_layout?.[1] ?? 0;
  return aCol - bCol;
});

const lines = windows.map((w) => {
  const col = w.layout?.pos_in_scrolling_layout?.[1] ?? 0;
  const app = w.app_id ?? "";
  const icon = findIcon(app);
  return `${w.id} ${w.workspace_id}:${col} [${app}] ${w.title}\x00icon\x1f${icon}`;
});

const fuzzelInput = new Response(lines.join("\n"));
const selected = (await $`fuzzel --dmenu --nth-delimiter ' ' --with-nth '{2..}' --accept-nth 1 -w 78 < ${fuzzelInput}`.text()).trim();
const id = selected.split(/\s/)[0];
if (!id) process.exit(0);

await $`niri msg action focus-window --id ${id}`;