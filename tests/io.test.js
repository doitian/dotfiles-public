import { expect, test } from "bun:test";
import { runBun } from "./helpers/run-bun.js";

test.each(["", "Hello, 世界 👋\n\nlast line", "one\r\ntwo\r\n"])(
  "readStdin preserves piped input %j",
  async (input) => {
    const result = await runBun(`
      import { readStdin } from "./src/lib/io.js";
      process.stdout.write(await readStdin());
    `, input);
    expect(result).toEqual({ exitCode: 0, stdout: input, stderr: "" });
  },
);

test("readLines trims input, skips blank lines, and awaits callbacks in order", async () => {
  const result = await runBun(`
    import { readLines } from "./src/lib/io.js";
    await readLines(async (line) => {
      await Bun.sleep(line === "first" ? 20 : 0);
      console.log(line);
    });
  `, "  first  \r\n\r\n \t \n second \nthird");
  expect(result).toEqual({ exitCode: 0, stdout: "first\nsecond\nthird\n", stderr: "" });
});

test("readLines reports callback errors and continues processing", async () => {
  const result = await runBun(`
    import { readLines } from "./src/lib/io.js";
    await readLines(async (line) => {
      if (line === "bad") throw new Error("invalid line");
      console.log(line);
    });
  `, "bad\ngood\n");
  expect(result).toEqual({ exitCode: 0, stdout: "good\n", stderr: "invalid line\n" });
});
