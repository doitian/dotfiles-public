/**
 * JSON file cache with a time-to-live, shared by CLI scripts.
 */
import { mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Value cached at path when it was written within ttlMs, otherwise null.
 * Missing, unreadable, and malformed files all count as a miss.
 * @param {string} path
 * @param {number} ttlMs
 * @returns {Promise<unknown | null>}
 */
export async function readCache(path, ttlMs) {
  let entry;
  try {
    // A missing file makes Bun.file(path).json() hang past process exit on
    // Windows (Bun 1.4.2), so read through node:fs instead.
    entry = JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
  if (!entry || typeof entry.updated !== "number") return null;
  if (Date.now() - entry.updated >= ttlMs) return null;
  return entry.value ?? null;
}

/**
 * Write value to path as a cache entry stamped with the current time.
 * @param {string} path
 * @param {unknown} value
 */
export async function writeCache(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, JSON.stringify({ updated: Date.now(), value }));
}