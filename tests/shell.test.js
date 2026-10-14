import { expect, test } from "bun:test";
import { runBun } from "./helpers/run-bun.js";

test("spawnSyncOrExit continues after success and preserves argument boundaries", async () => {
  const result = await runBun(`
    import { spawnSyncOrExit } from "./src/lib/shell.js";
    spawnSyncOrExit(process.execPath, "--eval", "console.log(process.argv.at(-1))", "spaces & symbols");
    console.log("continued");
  `);
  expect(result).toEqual({ exitCode: 0, stdout: "spaces & symbols\ncontinued\n", stderr: "" });
});

test("spawnSyncOrExit propagates failure without continuing", async () => {
  const result = await runBun(`
    import { spawnSyncOrExit } from "./src/lib/shell.js";
    spawnSyncOrExit(process.execPath, "--eval", "process.exit(7)");
    console.log("unreachable");
  `);
  expect(result).toEqual({ exitCode: 7, stdout: "", stderr: "" });
});

test.skipIf(process.platform === "win32")("spawnSyncOrExit exits with 128+N when the child is killed by a signal", async () => {
  const result = await runBun(`
    import { spawnSyncOrExit } from "./src/lib/shell.js";
    spawnSyncOrExit("sh", "-c", "kill -TERM $$");
    console.log("unreachable");
  `);
  expect(result).toEqual({ exitCode: 143, stdout: "", stderr: "" });
});
