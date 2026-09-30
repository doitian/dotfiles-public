#!/usr/bin/env bun
/**
 * Single niri startup entrypoint: spawns pam_kwallet_init, swayidle, wl-paste+cliphist, waybar, and niri-swaybg.
 * Replaces the five separate spawn-at-startup lines in config.kdl.
 */

import { $ } from "bun";

// Propagate SSH_AUTH_SOCK to systemd and D-Bus so GUI apps can use it
let sshAuthSock = process.env.SSH_AUTH_SOCK;
if (!sshAuthSock && Bun.which("gpgconf")) {
  sshAuthSock = (await $`gpgconf --list-dirs agent-ssh-socket`.nothrow().text()).trim();
}
if (sshAuthSock) {
  const extraEnv = {
    SSH_AUTH_SOCK: sshAuthSock,
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
    DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS,
  };
  await $`systemctl --user import-environment SSH_AUTH_SOCK`.env(extraEnv).nothrow();
  if (extraEnv.DBUS_SESSION_BUS_ADDRESS || extraEnv.XDG_RUNTIME_DIR) {
    await $`dbus-update-activation-environment --systemd SSH_AUTH_SOCK`.env(extraEnv).nothrow();
  }
}

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

const hasCliphist = !!Bun.which("cliphist");
const hasSwaylock = !!Bun.which("swaylock");

spawnDetached("/usr/lib/pam_kwallet_init");

const swayidleArgs = ["-w"];
if (hasCliphist) {
  swayidleArgs.push("timeout", "600", "cliphist wipe");
}
swayidleArgs.push("timeout", "900", "niri msg action power-off-monitors");
if (hasSwaylock) {
  swayidleArgs.push("timeout", "901", "swaylock -e --grace 10 -f");
  swayidleArgs.push("before-sleep", "swaylock -e --grace 10 -f");
}
spawnDetached("swayidle", swayidleArgs);

// wl-paste watching cliphist store, one watcher per MIME type (text and images)
if (hasCliphist) {
  spawnDetached("wl-paste", ["--type", "text", "--watch", "cliphist", "store"]);
  spawnDetached("wl-paste", ["--type", "image", "--watch", "cliphist", "store"]);
}

// waybar
spawnDetached("waybar");

spawnDetached("niri-swaybg");