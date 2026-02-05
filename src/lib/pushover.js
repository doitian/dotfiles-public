/**
 * Pushover API: credentials via gopass or env, send message.
 */
import { runCapture } from "./run.js";

const PUSHOVER_API = "https://api.pushover.net/1/messages.json";

/**
 * Get user key and app token from env or gopass.
 * @returns {Promise<{ userKey: string, appToken: string }>}
 */
export async function getCredentials() {
  const userKey = process.env.PUSHOVER_USER_KEY;
  const appToken = process.env.PUSHOVER_APP_TOKEN;
  if (userKey && appToken) return { userKey, appToken }

  const { code, stdout } = await runCapture("gopass", ["show", "-f", "web/pushover.net/ian"]);
  if (code !== 0) throw new Error("gopass failed to get Pushover credentials");
  const lines = stdout.split(/\r?\n/);
  let key = "";
  let personal = "";
  for (const line of lines) {
    const keyMatch = line.match(/^key:\s*(.+)$/);
    const personalMatch = line.match(/^personal:\s*(.+)$/);
    if (keyMatch) key = keyMatch[1].trim();
    if (personalMatch) personal = personalMatch[1].trim();
  }
  if (!key || !personal) throw new Error("Could not parse key/personal from gopass output");
  return { userKey: key, appToken: personal };
}

/**
 * Send a Pushover message. Merges user/token from getCredentials() with extraForm.
 * @param {Record<string, string>} extraForm - form fields (message, title, priority, etc.)
 */
export async function send(extraForm) {
  const { userKey, appToken } = await getCredentials();
  const form = new URLSearchParams({
    user: userKey,
    token: appToken,
    ...extraForm,
  });
  const res = await fetch(PUSHOVER_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pushover API error: ${res.status} ${text}`);
  }
}
