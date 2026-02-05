#!/usr/bin/env node
/**
 * Send a Pushover notification. Credentials from PUSHOVER_USER_KEY/PUSHOVER_APP_TOKEN or gopass.
 * Port of default/bin/pushover-send.
 */
import { send } from "./lib/pushover.js";

const args = process.argv.slice(2);

/**
 * Parse curl-style -d "key=value" or -d key=value from args into a form object.
 */
function parseFormArgs(args) {
  const form = /** @type {Record<string, string>} */ ({});
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-d" && args[i + 1] != null) {
      const part = args[++i];
      const eq = part.indexOf("=");
      if (eq !== -1) {
        const k = part.slice(0, eq).trim();
        let v = part.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
          v = v.slice(1, -1);
        form[k] = v;
      }
    }
  }
  return form;
}

async function main() {
  const form =
    args.length === 0 || args[0]?.startsWith("-")
      ? parseFormArgs(args)
      : { message: args.join(" ") };
  await send(form);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
