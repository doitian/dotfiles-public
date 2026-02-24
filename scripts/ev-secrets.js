#!/usr/bin/env bun
/**
 * Set secrets from ev. Run: bun run ev-secrets
 */
import { secrets, } from "bun";
import { SERVICE_NAME, gopass } from "../src/lib/secrets.js";

async function set(name, value) {
  await secrets.set({ service: SERVICE_NAME, name, value });
}

const openaiEntry = Bun.argv[2] ?? "default"
const [openai, pushover] = await Promise.all([gopass(`key/openai/${openaiEntry}`), gopass("web/pushover.net/ian")]);

await set("openai-api-key", openai.password);
await set("openai-base-url", openai.fields.get("base_url"));
await set("openai-model", openai.fields.get("model"));

await set("pushover-user-key", pushover.fields.get("key"));
await set("pushover-agent-token", pushover.fields.get("agent"));
await set("pushover-personal-token", pushover.fields.get("personal"));
