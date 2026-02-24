#!/usr/bin/env bun
/**
 * Send a Pushover notification. Credentials from env or Bun secrets (getSecret).
 * Port of default/bin/pushover-send.
 */
import { getPushoverCredentials } from "./lib/secrets.js";
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
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        )
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
  const creds = await getPushoverCredentials("personal");
  await send(form, creds);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
