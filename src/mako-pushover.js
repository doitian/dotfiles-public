#!/usr/bin/env bun
/**
 * Forward a mako notification using the desktop-notification Pushover app token.
 * Mako config: on-notify=exec mako-pushover "$id"
 */
import { $ } from "bun";
import { mkdir } from "node:fs/promises";
import { homedir, hostname } from "node:os";
import { dirname, join } from "node:path";
import { getPushoverCredentials } from "./lib/secrets.js";
import { send } from "./lib/pushover.js";

const forwardedPrefix = "[mako]";

function usage(code = 0) {
  const out = code === 0 ? process.stdout : process.stderr;
  out.write(`Usage: mako-pushover <notification-id>
       mako-pushover setup
       mako-pushover teardown

Forward a notification from mako to Pushover.
Forwarded titles get a [mako][hostname] prefix; returning notifications are skipped.
Recognizable Pushover notifications are also skipped.
setup/teardown install/remove the managed hook and reload mako.
setup checks the Pushover user key and desktop-notification app token first.
Config: $XDG_CONFIG_HOME/mako/config (default: ~/.config/mako/config).
The mako-pushover executable must be on mako's PATH.
Existing section-specific on-notify rules take precedence.
`);
  process.exit(code);
}

const blockStart = "# BEGIN mako-pushover";
const blockEnd = "# END mako-pushover";

async function configure(action) {
  if (action === "setup") {
    await getPushoverCredentials("desktop-notification");
  }
  const path = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "mako", "config");
  const file = Bun.file(path);
  const original = (await file.exists()) ? await file.text() : "";
  // Keep line endings and all content outside our block exactly as written.
  const lines = original.match(/[^\n]*\n|[^\n]+$/g) || [];
  const starts = lines.flatMap((line, i) => line.trim() === blockStart ? [i] : []);
  const ends = lines.flatMap((line, i) => line.trim() === blockEnd ? [i] : []);
  if (starts.length || ends.length) {
    if (starts.length !== 1 || ends.length !== 1 || starts[0] >= ends[0]) {
      throw new Error(`Malformed mako-pushover block in ${path}; repair its markers first`);
    }
    lines.splice(starts[0], ends[0] - starts[0] + 1);
  }
  let updated = lines.join("");
  if (action === "setup") {
    const globalConfig = updated.split(/^\s*\[/m)[0];
    if (/^\s*on-notify\s*=/m.test(globalConfig)) {
      throw new Error(`An existing global on-notify hook is configured in ${path}; remove or move it before setup`);
    }
    const newline = original.includes("\r\n") ? "\r\n" : "\n";
    updated = [blockStart, 'on-notify=exec mako-pushover "$id"', blockEnd, ""].join(newline) + updated;
  }
  if (updated !== original) {
    await mkdir(dirname(path), { recursive: true });
    await Bun.write(path, updated);
  }
  // Always reload, including on retries after a previous reload failure.
  const result = await $`makoctl reload`.nothrow();
  if (result.exitCode !== 0) {
    throw new Error(`Config updated at ${path}, but mako reload failed; run makoctl reload when mako is available`);
  }
  console.log(`${action === "setup" ? "Enabled" : "Disabled"} mako-pushover in ${path}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ["-h", "--help"].includes(args[0])) usage();
  if (args.length === 1 && ["setup", "teardown"].includes(args[0])) {
    await configure(args[0]);
    return;
  }
  if (
    args.length !== 1 ||
    !/^\d+$/.test(args[0]) ||
    Number(args[0]) < 1 ||
    Number(args[0]) > 0xffffffff
  ) {
    usage(1);
  }

  const notifications = await $`makoctl list -j`.json();
  const notification = notifications.find((item) => item.id === Number(args[0]));
  // The notification may have expired or been dismissed before the hook runs.
  if (!notification) return;
  // Firefox does not expose the originating website in mako's metadata.
  if (notification.summary?.trimStart().startsWith(forwardedPrefix)) return;
  // Native clients identify the app; browser notifications may expose only
  // the Pushover site in their title/body. Check before resolving credentials.
  const fromPushover = [
    notification.app_name,
    notification.desktop_entry,
    notification.app_icon,
  ].some((value) => typeof value === "string" && /pushover/i.test(value));
  const pushoverTitle = /^pushover(?:\b|_)/i.test(notification.summary?.trim() || "");
  const pushoverSite = [notification.summary, notification.body].some(
    (value) => typeof value === "string" && /\bpushover\.net\b/i.test(value),
  );
  if (fromPushover || pushoverTitle || pushoverSite) return;

  const title =
    notification.summary?.trim() ||
    notification.app_name?.trim() ||
    "Desktop notification";
  const message = notification.body?.trim() || title;
  const credentials = await getPushoverCredentials("desktop-notification");
  await send(
    {
      title: Array.from(`${forwardedPrefix}[${hostname()}] ${title}`).slice(0, 250).join(""),
      message: Array.from(message).slice(0, 1024).join(""),
    },
    credentials,
  );
}

main().catch((err) => {
  console.error(`mako-pushover: ${err.message}`);
  process.exit(1);
});
