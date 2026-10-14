import { access, constants } from "node:fs/promises";

/**
 * Async filesystem helpers.
 */

/**
 * Returns true if path exists and is accessible, false otherwise.
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a JSON-with-comments file that must hold an object. A missing or blank
 * file yields {}; anything unparsable throws so callers never overwrite it.
 * @param {string} path
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readJsoncObject(path) {
  const file = Bun.file(path);
  if (!(await file.exists())) return {};
  const text = await file.text();
  if (!text.trim()) return {};
  let value;
  try {
    value = Bun.JSONC.parse(text);
  } catch (err) {
    throw new Error(`Cannot parse ${path}: ${err.message}`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must contain a JSON object`);
  }
  return value;
}

export async function touch(path) {
  await writeIfNotExists(path, "");
}

export async function writeIfNotExists(path, content) {
  if (await exists(path)) {
    return 0;
  } else {
    return await Bun.file(path).write(content);
  }
}
