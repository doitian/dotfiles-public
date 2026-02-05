/**
 * Async filesystem helpers.
 */
import { access } from "node:fs/promises";

/**
 * Returns true if path exists and is accessible, false otherwise.
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
