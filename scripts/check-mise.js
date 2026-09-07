import { createMiseSandbox, globalConfig } from "../tests/helpers/mise.js";

const sandbox = await createMiseSandbox();
try {
  const expected = Object.keys(Bun.TOML.parse(await Bun.file(globalConfig).text()).tasks).sort();
  const listed = await sandbox.run(["tasks", "ls", "--hidden", "--json"]);
  if (listed.exitCode !== 0) throw new Error(listed.stderr);
  const actual = JSON.parse(listed.stdout).map((task) => task.name).sort();
  if (!expected.length || JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("mise did not load all tasks from mise/conf.d/global.toml");
  }
  const result = await sandbox.run(["tasks", "validate"]);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
} finally {
  await sandbox.cleanup();
}
