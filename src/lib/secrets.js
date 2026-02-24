/**
 * Credentials via Bun Secrets API (env fallback, optional TTY prompt).
 * Service name used for Bun.secrets get/set/delete.
 */
import { secrets, $ } from "bun";

export const SERVICE_NAME = "ian-bin";

/**
 * Resolve a secret: try env vars first, then Bun.secrets, then prompt and store if TTY.
 * @param {string} secretName - Name used for Bun.secrets (e.g. "openai-api-key").
 * @param {...string} envVarNames - Env var names to check in order (e.g. "OPENAI_API_KEY").
 * @returns {Promise<string>} The secret value.
 * @throws {Error} When value is not set and stdin is not a TTY.
 */
export async function getSecret(secretName, ...envVarNames) {
  for (const name of envVarNames) {
    const val = process.env[name];
    if (val != null && val !== "") return val;
  }
  let value = await secrets.get({
    service: SERVICE_NAME,
    name: secretName,
  });
  if (value != null && value !== "") return value;
  if (process.stdin.isTTY) {
    value = prompt(`Enter value for ${secretName}: `);
    if (value == null || value === "") {
      throw new Error(`No value provided for ${secretName}`);
    }
    await secrets.set({
      service: SERVICE_NAME,
      name: secretName,
      value,
    });
    return value;
  }
  throw new Error(
    `Missing secret "${secretName}" (set one of: ${envVarNames.join(", ")}, or run interactively to store)`,
  );
}

export async function getPushoverCredentials(app) {
  const appUpperCase = app.toUpperCase();
  const userKey = await getSecret("pushover-user-key", "PUSHOVER_USER_KEY");
  const appToken = await getSecret(
    `pushover-${app}-token`,
    `PUSHOVER_${appUpperCase}_TOKEN`,
    "PUSHOVER_APP_TOKEN",
  );
  return { userKey, appToken };
}

export async function getOpenAICredentials() {
  const apiKey = await getSecret("openai-api-key", "OPENAI_API_KEY");
  const baseURL = await getSecret("openai-base-url", "OPENAI_BASE_URL");
  const model =
    (await getSecret("openai-model", "OPENAI_MODEL")) ?? "gpt-4o-mini";
  return { apiKey, baseURL, model };
}

export async function gopassPassword(name) {
  return await $`gopass show -o ${name}`.text()
}

export async function gopass(name) {
  let password = null;
  const fields = new Map();
  for await (const line of $`gopass show -f ${name}`.lines()) {
    if (!password) {
      password = line;
    } else {
      const idx = line.indexOf(": ");
      if (idx !== -1) {
        fields.set(line.slice(0, idx), line.slice(idx + 2));
      }
    }
  }
  return { password, fields };
}

export async function gopassFields(name) {
  return (await gopass(name)).fields
}
