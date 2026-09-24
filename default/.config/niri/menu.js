/**
 * niri-menu config (~/.config/niri/menu.js), loaded at runtime by `niri-menu`.
 * Edit and save — no rebuild needed. Preview with: niri-menu --print
 *
 * Default-export a function receiving { $, spawnDetached, submenu, afterClose }
 * and returning the menu tree. Leaves are async actions; nest with plain objects
 * or submenu(async () => ({ ... })) for lazily-built (fresh state) levels.
 * Use afterClose(shellCmd) for actions that must run after rofi exits (e.g.
 * anything that opens rofi again).
 * Presented as a true nested menu via rofi script mode.
 */
export default ({ $, spawnDetached, submenu, afterClose }) => ({
  "\u{F009}  Niri": submenu(async () => ({
    "\u{F011}  Exit": async () => {
      await $`niri msg action quit`.quiet().nothrow();
    },
    "\u{F11C}  Shortcuts": submenu(async () => {
      const kdl = await Bun.file(`${process.env.HOME}/.config/niri/config.kdl`).text();
      const entries = {};
      for (const line of kdl.split("\n")) {
        const m = line.match(
          /^\s*(\S+)\s+hotkey-overlay-title="([^"]+)"[^{]*\{\s*([\w-]+)\s*(.*?);?\s*\}\s*$/,
        );
        if (!m) continue;
        // KDL args are already shell-quoted; `--` keeps them from being read as flags
        const [, key, title, action, args] = m;
        const cmd = `niri msg action ${action}${args ? ` -- ${args}` : ""}`;
        entries[`${key.padEnd(22)} ${title}`] = () => afterClose(cmd);
      }
      return entries;
    }),
  })),
  "\u{F1DE}  Waybar": submenu(async () => {
    const entries = {
      "\u{F021}  Restart": async () => {
        await $`killall waybar`.quiet().nothrow();
        spawnDetached("waybar");
      },
    };
    const r = await $`waybar-optional status`.quiet().nothrow();
    if (r.exitCode === 0) {
      for (const line of r.stdout.toString().trim().split("\n")) {
        const [name, state] = line.split(": ");
        if (!name || !state) continue;
        entries[`\u{F21B}  ${name} (${state})`] = async () => {
          await $`waybar-optional toggle ${name}`.quiet().nothrow();
        };
      }
    }
    return entries;
  }),
});
