#!/usr/bin/env bun
/**
 * Send Pushover notification using agent app token (PUSHOVER_AGENT_TOKEN).
 * Same CLI as pushover-send but uses different token.
 */
import { getSecret } from "./lib/secrets.js";
import { send } from "./lib/pushover.js";

async function getCredentials() {
  const userKey = await getSecret("pushover-user-key", "PUSHOVER_USER_KEY");
  const appToken = await getSecret(
    "pushover-agent-token",
    "PUSHOVER_AGENT_TOKEN"
  );
  return { userKey, appToken };
}

function usage(code = 0) {
  const out = code === 0 ? process.stdout : process.stderr;
  out.write(`Usage: agent-pushover [OPTIONS] <message>

Options:
  -t, --title <title>       Notification title
  -p, --priority <priority> Priority, default: 0, low to high: -2~2
  -h, --help                Show this help message
`);
  process.exit(code);
}

let title = "";
let priority = "";
let message = "";
const argv = process.argv.slice(2);

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "-t" || arg === "--title") {
    title = argv[++i] ?? "";
    continue;
  }
  if (arg === "-p" || arg === "--priority") {
    const v = argv[++i];
    if (["-2", "-1", "0", "1", "2"].includes(v)) priority = v;
    else {
      console.error("Error: priority must be -2, -1, 0, 1, or 2");
      usage(1);
    }
    continue;
  }
  if (arg === "-h" || arg === "--help") usage(0);
  if (arg.startsWith("-")) {
    console.error(`Unknown option: ${arg}`);
    usage(1);
  }
  message = arg;
  break;
}

if (!message) {
  console.error("Error: message is required");
  usage(1);
}

const form = { message };
if (title) form.title = title;
if (priority) form.priority = priority;

(async () => {
  const creds = await getCredentials();
  await send(form, creds);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
