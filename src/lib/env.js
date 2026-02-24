/**
 * Environment helpers shared by CLI scripts.
 */

/** User home directory (USERPROFILE on Windows, HOME otherwise). */
export function home() {
	return process.env.USERPROFILE || process.env.HOME || "";
}
