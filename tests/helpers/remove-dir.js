import { rm } from "node:fs/promises";

// Bun ignores rm's maxRetries/retryDelay, and Windows briefly keeps
// just-exited executables locked, so retry transient lock errors here.
const transient = new Set(["EBUSY", "EPERM", "ENOTEMPTY"]);

export async function removeDir(path, { attempts = 30, delay = 100 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await rm(path, { recursive: true, force: true });
    } catch (error) {
      if (attempt >= attempts || !transient.has(error.code)) throw error;
      await Bun.sleep(delay);
    }
  }
}
