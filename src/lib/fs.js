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
