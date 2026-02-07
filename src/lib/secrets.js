/**
 * Credentials via Bun Secrets API (env fallback, optional TTY prompt).
 * Service name used for Bun.secrets get/set/delete.
 */
import { secrets } from "bun";

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
        `Missing secret "${secretName}" (set one of: ${envVarNames.join(", ")}, or run interactively to store)`
    );
}
