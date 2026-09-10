#!/usr/bin/env bun
/**
 * Set secrets from ev. Run: bun run ev-secrets
 */
import { secrets, } from "bun";
import { SERVICE_NAME, gopass } from "../src/lib/secrets.js";
import { googleTasksSecrets } from "../src/gtasks.js";

export async function main(args = Bun.argv.slice(2), { readEntry = gopass, store = secrets } = {}) {
  async function set(name, value) {
    await store.set({ service: SERVICE_NAME, name, value });
  }

  async function importGoogleTasks(entry = "key/cloud.google.com/gwscli") {
    const entries = googleTasksSecrets(await readEntry(entry));
    const clientId = entries.find(([name]) => name === "google-tasks-client-id")[1];
    const oldClientId = await store.get({ service: SERVICE_NAME, name: "google-tasks-client-id" });
    if (oldClientId !== clientId) {
      await store.delete({ service: SERVICE_NAME, name: "google-tasks-refresh-token" });
    }
    for (const [name, value] of entries) await set(name, value);
  }

  if (args[0] === "--google-tasks") {
    await importGoogleTasks(args[1]);
    return;
  }

  const openaiEntry = args[0] ?? "default"
  const [openai, pushover, moonshot] = await Promise.all([
    readEntry(`key/openai/${openaiEntry}`),
    readEntry("web/pushover.net/ian"),
    readEntry("key/moonshot/personal"),
  ]);

  await set("openai-api-key", openai.password);
  await set("openai-base-url", openai.fields.get("OPENAI_BASE_URL"));
  await set("openai-model", openai.fields.get("OPENAI_DEFAULT_MODEL"));

  await set("moonshot-token", moonshot.password);

  await set("pushover-user-key", pushover.fields.get("key"));
  await set("pushover-agent-token", pushover.fields.get("agent"));
  await set("pushover-personal-token", pushover.fields.get("personal"));
  await set("pushover-desktop-notification-token", pushover.fields.get("desktop-notification"));

  await importGoogleTasks();
}

if (import.meta.main) main().catch(error => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
