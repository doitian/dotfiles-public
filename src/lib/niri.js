/**
 * Shared niri helpers.
 */
import { $ } from "bun";

// App-ids that use Ctrl+Shift+V for paste instead of Ctrl+V
const SHIFT_PASTE_APP_IDS = new Set(["kitty", "org.kde.konsole", "foot", "alacritty", "wezterm"]);

// ydotool key args (press:1 release:0) from linux/input-event-codes.h
// KEY_LEFTCTRL=29, KEY_LEFTSHIFT=42, KEY_V=47
const PASTE_KEYS = ["29:1", "47:1", "47:0", "29:0"]; // Ctrl+V
const PASTE_SHIFT_KEYS = ["29:1", "42:1", "47:1", "47:0", "42:0", "29:0"]; // Ctrl+Shift+V

/**
 * Simulate the paste shortcut in the focused niri window with ydotool,
 * using Ctrl+Shift+V in terminals.
 * @returns {Promise<{ exitCode: number, stderr: Buffer }>}
 */
export async function pasteFocused() {
  let appId = "";
  const focused = await $`niri msg --json focused-window`.quiet().nothrow();
  if (focused.exitCode === 0) {
    try {
      appId = JSON.parse(focused.stdout.toString())?.app_id ?? "";
    } catch {
      // ignore parse errors
    }
  }
  const keys = SHIFT_PASTE_APP_IDS.has(appId) ? PASTE_SHIFT_KEYS : PASTE_KEYS;
  return $`ydotool key ${keys}`.quiet().nothrow();
}