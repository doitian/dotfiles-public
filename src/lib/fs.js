/**
 * Async filesystem helpers.
 */

/**
 * Returns true if path exists and is accessible, false otherwise.
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function exists(path) {
	return await Bun.file(path).exists();
}

export async function touch(path) {
	await writeIfNotExists(path, "");
}

export async function writeIfNotExists(path, content) {
	const file = Bun.file(path);
	if (await file.exists()) {
		return 0;
	} else {
		return await file.write(content);
	}
}
