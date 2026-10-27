#!/usr/bin/env bun
/**
 * Send a message to one or more Grok Bots through the message-queue webhook.
 * Credentials come from the environment or dev/grokbot-webhooks/message-queue in gopass.
 */
import { parseArgs as parseArgsUtil } from "node:util";
import { readStdin } from "./lib/io.js";
import { gopass } from "./lib/secrets.js";

export const CREDENTIALS_ENTRY = "dev/grokbot-webhooks/message-queue";

const USAGE = `Usage: grokbot-send [options] [message...]

Send a message through the Grok Bot message queue. With no message arguments, read it from stdin.

Options:
  -t, --to <bots>     Optional recipients, comma-separated or repeated
  -f, --from <name>   Sender name (default: GROK_BOT_FROM, USER/USERNAME, or grokbot-send)
  -h, --help          Show this help

Environment:
  GROK_BOT_WEBHOOK_ENDPOINT  Webhook URL (falls back to gopass)
  GROK_BOT_WEBHOOK_TOKEN     Sender key (falls back to gopass)
  GROK_BOT_FROM              Default sender name

Gopass entry: ${CREDENTIALS_ENTRY}
`;

export function parseArgs(argv) {
  const { values, positionals } = parseArgsUtil({
    args: argv,
    allowPositionals: true,
    options: {
      from: { type: "string", short: "f" },
      help: { type: "boolean", short: "h" },
      to: { type: "string", short: "t", multiple: true },
    },
  });
  if (values.help) return { help: true };

  const to = (values.to ?? [])
    .flatMap(value => value.split(","))
    .map(value => value.trim())
    .filter(Boolean);
  return { from: values.from, help: false, messageParts: positionals, to };
}

export async function getCredentials(env = process.env, readEntry = gopass) {
  let endpoint = env.GROK_BOT_WEBHOOK_ENDPOINT?.trim();
  let token = env.GROK_BOT_WEBHOOK_TOKEN?.trim();
  if (!endpoint || !token) {
    const entry = await readEntry(CREDENTIALS_ENTRY);
    endpoint ||= entry.fields.get("GROK_BOT_WEBHOOK_ENDPOINT")?.trim();
    token ||= entry.password?.trim();
  }
  if (!endpoint || !token) {
    throw new Error(
      `Missing webhook credentials; set GROK_BOT_WEBHOOK_ENDPOINT and GROK_BOT_WEBHOOK_TOKEN, or populate ${CREDENTIALS_ENTRY} in gopass`,
    );
  }
  return { endpoint, token };
}

export async function send(payload, { endpoint, token }, fetchImpl = fetch) {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = (await response.text()).trim();
    throw new Error(`Grok Bot webhook error: ${response.status}${text ? ` ${text}` : ""}`);
  }
}

export async function run(argv, {
  env = process.env,
  fetchImpl = fetch,
  output = process.stdout,
  readEntry = gopass,
  readInput = readStdin,
} = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    await output.write(USAGE);
    return;
  }
  const message = (args.messageParts.length ? args.messageParts.join(" ") : await readInput()).trim();
  if (!message) throw new Error("Message is empty; pass it as arguments or pipe it on stdin");
  const from = (args.from ?? env.GROK_BOT_FROM ?? env.USER ?? env.USERNAME ?? "grokbot-send").trim();
  if (!from) throw new Error("Sender name cannot be empty");
  const credentials = await getCredentials(env, readEntry);
  await send({ from, to: args.to, message }, credentials, fetchImpl);
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  await run(argv, deps);
}

if (import.meta.main || Bun.isStandaloneExecutable) main().catch(error => {
  console.error(`grokbot-send: ${error.message ?? error}`);
  process.exitCode = 1;
});
