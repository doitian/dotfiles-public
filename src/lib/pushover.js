/**
 * Pushover API: send message. Credentials are passed in by the caller.
 */
const PUSHOVER_API = "https://api.pushover.net/1/messages.json";

/**
 * Send a Pushover message.
 * @param {Record<string, string>} extraForm - form fields (message, title, priority, etc.)
 * @param {{ userKey: string, appToken: string }} credentials - from env/config in the calling executable
 */
export async function send(extraForm, { userKey, appToken }) {
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
