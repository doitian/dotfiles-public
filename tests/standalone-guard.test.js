import { expect, test } from "bun:test";
import { Glob } from "bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// build.js compiles every entrypoint to a standalone executable, where
// import.meta.main is false; entrypoints must also check Bun.isStandaloneExecutable.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const entryDirs = [
  join(repoRoot, "src"),
  join(repoRoot, "src", "mise-tasks"),
  join(repoRoot, "src", "niri-scripts"),
  join(repoRoot, "..", "private", "src"),
];

test("compiled entrypoints run their main block in standalone executables", async () => {
  const offenders = [];
  for (const dir of entryDirs) {
    if (!existsSync(dir)) continue;
    for await (const file of new Glob("*.js").scan(dir)) {
      const lines = (await Bun.file(join(dir, file)).text()).split("\n");
      lines.forEach((line, index) => {
        if (line.includes("import.meta.main") && !line.includes("Bun.isStandaloneExecutable")) {
          offenders.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
  expect(offenders).toEqual([]);
});
