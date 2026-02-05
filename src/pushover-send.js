#!/usr/bin/env node
/**
 * Send a Pushover notification. Credentials from PUSHOVER_USER_KEY/PUSHOVER_PERSONAL_TOKEN or injected config.
 * Port of default/bin/pushover-send.
 */
import {
    DEFAULT_PUSHOVER_USER_KEY,
    DEFAULT_PUSHOVER_PERSONAL_TOKEN,
} from "./lib/config.js";
import { send } from "./lib/pushover.js";

const args = process.argv.slice(2);

function getCredentials() {
    const userKey = process.env.PUSHOVER_USER_KEY ?? DEFAULT_PUSHOVER_USER_KEY;
    const appToken =
        process.env.PUSHOVER_PERSONAL_TOKEN ?? process.env.PUSHOVER_APP_TOKEN ?? DEFAULT_PUSHOVER_PERSONAL_TOKEN;
    if (!userKey || !appToken)
        throw new Error(
            "Missing Pushover credentials: set PUSHOVER_USER_KEY and PUSHOVER_PERSONAL_TOKEN (or build with defaults)"
        );
    return { userKey, appToken };
}

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
    await send(form, getCredentials());
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
