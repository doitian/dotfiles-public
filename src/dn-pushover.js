#!/usr/bin/env bun
import { $ } from "bun";
import { mkdir } from "node:fs/promises";
import { homedir, hostname } from "node:os";
import { dirname, join } from "node:path";
import { readStdin } from "./lib/io.js";
import { getPushoverCredentials } from "./lib/secrets.js";
import { send } from "./lib/pushover.js";
import { configureWindows } from "./lib/dn-windows.js";

const forwardedPrefix = "[DN]";

function usage(code = 0) {
  const out = code === 0 ? process.stdout : process.stderr;
  out.write(`Usage: dn-pushover setup
       dn-pushover teardown [--cleanup]
       dn-pushover <notification-id>  (Linux mako hook)

Forward desktop notifications to Pushover with a [DN][hostname] title prefix.
Windows: setup builds, signs, and launches the C# listener, reusing an existing build.
Requires Windows 10 2004+, a .NET 10 SDK for the first build, and the Windows SDK
(makeappx/signtool). Setup creates a per-user code-signing cert (CN=dn-pushover).
If LocalMachine\TrustedPeople does not already contain it, setup
imports the public cert (UAC prompt if needed; skipped when already trusted).
Install SDK: scoop bucket add versions; scoop install versions/dotnet-sdk-lts
Verify: dotnet --list-sdks (must include 10.0.x).
teardown stops the listener; --cleanup also unregisters and deletes its files.
Linux: requires makoctl; setup/teardown install/remove the hook and reload mako.
--cleanup has no additional effect on Linux.
Recognizable Pushover notifications are also skipped.
setup checks the Pushover user key and desktop-notification app token first.
Config: $XDG_CONFIG_HOME/mako/config (default: ~/.config/mako/config).
The dn-pushover executable must be on mako's PATH.
Existing section-specific on-notify rules take precedence.
`);
  process.exit(code);
}

export function makoConfig(original, action) {
  // Keep line endings and all content outside our block exactly as written.
  const lines = original.match(/[^\n]*\n|[^\n]+$/g) || [];
  // Migrate the previously shipped hook so deleting its binary cannot strand it.
  for (const name of ["mako-pushover", "dn-pushover"]) {
    const starts = lines.flatMap((line, i) => line.trim() === `# BEGIN ${name}` ? [i] : []);
    const ends = lines.flatMap((line, i) => line.trim() === `# END ${name}` ? [i] : []);
    if (starts.length || ends.length) {
      if (starts.length !== 1 || ends.length !== 1 || starts[0] >= ends[0] ||
        lines.slice(starts[0] + 1, ends[0]).some((line) => /^# (BEGIN|END) (mako|dn)-pushover$/.test(line.trim()))) {
        throw new Error(`Malformed ${name} block; repair its markers first`);
      }
      lines.splice(starts[0], ends[0] - starts[0] + 1);
    }
  }
  let updated = lines.join("");
  if (action === "setup") {
    const globalConfig = updated.split(/^\s*\[/m)[0];
    if (/^\s*on-notify\s*=/m.test(globalConfig)) {
      throw new Error("An existing global on-notify hook is configured; remove or move it before setup");
    }
    const newline = original.includes("\r\n") ? "\r\n" : "\n";
    updated = ["# BEGIN dn-pushover", 'on-notify=exec dn-pushover "$id"', "# END dn-pushover", ""].join(newline) + updated;
  }
  return updated;
}

async function configureMako(action) {
  const path = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "mako", "config");
  const file = Bun.file(path);
  const original = (await file.exists()) ? await file.text() : "";
  const updated = makoConfig(original, action);
  if (updated !== original) {
    await mkdir(dirname(path), { recursive: true });
    await Bun.write(path, updated);
  }
  // Always reload, including on retries after a previous reload failure.
  const result = await $`makoctl reload`.nothrow();
  if (result.exitCode !== 0) {
    throw new Error(`Config updated at ${path}, but mako reload failed; run makoctl reload when mako is available`);
  }
  console.log(`${action === "setup" ? "Enabled" : "Disabled"} dn-pushover in ${path}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ["-h", "--help"].includes(args[0])) usage();
  if (!["win32", "linux"].includes(process.platform)) {
    throw new Error("Only Windows and Linux are supported");
  }
  if (process.platform === "linux" && !Bun.which("makoctl")) {
    throw new Error("makoctl is not available on PATH; Linux forwarding requires mako");
  }
  if ((args.length === 1 && ["setup", "teardown"].includes(args[0])) ||
    (args.length === 2 && args[0] === "teardown" && args[1] === "--cleanup")) {
    if (args[0] === "setup") await getPushoverCredentials("desktop-notification");
    if (process.platform === "win32") await configureWindows(args[0], args[1] === "--cleanup");
    else await configureMako(args[0]);
    return;
  }
  if (process.platform === "win32") {
    if (args.length !== 1 || args[0] !== "--forward") usage(1);
    const raw = await readStdin();
    const item = JSON.parse(raw);
    if (!item || typeof item !== "object" ||
      ["title", "message", "app", "appId"].some((key) => typeof item[key] !== "string")) {
      throw new Error("Expected notification JSON with title, message, app, and appId strings");
    }
    await forward({ summary: item.title, body: item.message, app_name: item.app, desktop_entry: item.appId });
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
  await forward(notification);
}

export function notificationPayload(notification, host = hostname()) {
  if (/^\[(DN|mako)\]/.test(notification.summary?.trimStart() || "")) return;
  // Native clients identify the app; browser notifications may expose only
  // the Pushover site in their title/body. Check before resolving credentials.
  const fromPushover = [
    notification.app_name,
    notification.desktop_entry,
    notification.app_icon,
  ].some((value) => typeof value === "string" && /(?:^|[^a-z0-9])pushover(?:$|[^a-z0-9])/i.test(value) && !/dn[-.]?pushover/i.test(value));
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
  return {
    title: Array.from(`${forwardedPrefix}[${host}] ${title}`).slice(0, 250).join(""),
    message: Array.from(message).slice(0, 1024).join(""),
  };
}

async function forward(notification) {
  const payload = notificationPayload(notification);
  if (!payload) return;
  await send(payload, await getPushoverCredentials("desktop-notification"));
}

const compiled = /^(?:[a-z]:)?\/(?:\$bunfs|~BUN)\//i.test((process.argv[1] || "").replaceAll("\\", "/"));
if (import.meta.main || compiled) main().catch((err) => {
  console.error(`dn-pushover: ${err.message}`);
  process.exit(1);
});
