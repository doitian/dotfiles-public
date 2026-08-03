#!/usr/bin/env bun
/**
 * List niri windows via JSON, present in fuzzel, focus the selected window.
 */

import { $ } from "bun";
import { join } from "node:path";

const DESKTOP_DIRS = [
  join(process.env.HOME, ".local/share/applications"),
  "/usr/share/applications",
];

const iconCache = new Map();

function appIdVariants(appId) {
  const last = appId.includes(".") ? appId.split(".").at(-1) : null;
  return [...new Set([appId, appId.toLowerCase(), last, last?.toLowerCase()].filter(Boolean))];
}

async function findIcon(appId) {
  if (!appId) return "";
  if (iconCache.has(appId)) return iconCache.get(appId);

  for (const variant of appIdVariants(appId)) {
    for (const dir of DESKTOP_DIRS) {
      const file = Bun.file(join(dir, `${variant}.desktop`));
      if (!(await file.exists())) continue;
      const match = (await file.text()).match(/^Icon=(.+)$/m);
      if (match) {
        iconCache.set(appId, match[1]);
        return match[1];
      }
    }
  }
  iconCache.set(appId, appId);
  return appId;
}

const windows = await $`niri msg --json windows`.json();
windows.sort((a, b) => {
  if (a.workspace_id !== b.workspace_id) return a.workspace_id - b.workspace_id;
  const aCol = a.layout?.pos_in_scrolling_layout?.[1] ?? 0;
  const bCol = b.layout?.pos_in_scrolling_layout?.[1] ?? 0;
  return aCol - bCol;
});

const lines = await Promise.all(
  windows.map(async (w) => {
    const col = w.layout?.pos_in_scrolling_layout?.[1] ?? 0;
    const app = w.app_id ?? "";
    const icon = await findIcon(app);
    return `${w.id} ${w.workspace_id}:${col} [${app}] ${w.title}\x00icon\x1f${icon}`;
  }),
);

const fuzzelInput = new Response(lines.join("\n"));
const selected = (
  await $`fuzzel --dmenu --nth-delimiter ' ' --with-nth '{2..}' --accept-nth 1 -w 78 < ${fuzzelInput}`.text()
).trim();
const id = selected.split(/\s/)[0];
if (!id) process.exit(0);

await $`niri msg action focus-window --id ${id}`;
