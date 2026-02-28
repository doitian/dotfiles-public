#!/usr/bin/env bun
/**
 * Single niri startup entrypoint: spawns pam_kwallet_init, swayidle, wl-paste+clipman, waybar, and niri-swaybg.
 * Replaces the five separate spawn-at-startup lines in config.kdl.
 */

function spawnDetached(cmd, args = [], opts = {}) {
  if (Bun.which(cmd)) {
    Bun.spawn([cmd, ...args], {
      detached: true,
      stdout: opts.stdout ?? "ignore",
      stderr: opts.stderr ?? "ignore",
      stdin: "ignore",
      ...opts,
    });
  }
}

spawnDetached("/usr/lib/pam_kwallet_init");

const hasClipman = !!Bun.which("clipman");
const hasSwaylock = !!Bun.which("swaylock");

const swayidleArgs = ["-w"];
if (hasClipman) {
  swayidleArgs.push("timeout", "600", "clipman clear -a");
}
swayidleArgs.push("timeout", "900", "niri msg action power-off-monitors");
if (hasSwaylock) {
  swayidleArgs.push("timeout", "901", "swaylock -e --grace 10 -f");
  swayidleArgs.push("before-sleep", "swaylock -e --grace 10 -f");
}
spawnDetached("swayidle", swayidleArgs);

// wl-paste watching clipman store
if (hasClipman) {
  spawnDetached("wl-paste", ["-t", "text", "--watch", "clipman", "store"]);
}

// waybar
spawnDetached("waybar");

spawnDetached("niri-swaybg");