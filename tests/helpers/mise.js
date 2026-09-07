import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const globalConfig = fileURLToPath(new URL("../../mise/conf.d/global.toml", import.meta.url));
const mise = Bun.which("mise");

export async function createMiseSandbox() {
  if (!mise) throw new Error("mise is required; install the version listed in .github/workflows/test-scripts.yml");
  const root = await mkdtemp(join(tmpdir(), "dotfiles-mise-test-"));
  const project = join(root, "project with spaces");
  const config = join(root, "config");
  const bin = join(root, "bin");
  await Promise.all([project, bin, config, join(root, "home")].map(
    (directory) => mkdir(directory, { recursive: true }),
  ));
  await copyFile(globalConfig, join(config, "config.toml"));
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP)$/i.test(key)) env[key] = value;
  }
  const pathKey = Object.keys(env).find((key) => key.toUpperCase() === "PATH") || "PATH";
  env[pathKey] = [bin, dirname(mise), dirname(process.execPath), env[pathKey]].join(delimiter);
  Object.assign(env, {
    HOME: join(root, "home"),
    USERPROFILE: join(root, "home"),
    MISE_CONFIG_DIR: config,
    MISE_GLOBAL_CONFIG_FILE: join(config, "config.toml"),
    MISE_SYSTEM_CONFIG_DIR: join(root, "system"),
    MISE_SYSTEM_CONFIG_FILE: join(root, "system", "config.toml"),
    MISE_DATA_DIR: join(root, "data"),
    MISE_CACHE_DIR: join(root, "cache"),
    MISE_STATE_DIR: join(root, "state"),
    MISE_CEILING_PATHS: root,
    MISE_TRUSTED_CONFIG_PATHS: root,
    MISE_YES: "1",
    MISE_NO_HOOKS: "1",
    MISE_TASK_RUN_AUTO_INSTALL: "false",
    NO_COLOR: "1",
  });

  async function run(args) {
    const child = Bun.spawn([mise, ...args], {
      cwd: project,
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    const timer = setTimeout(() => child.kill(), 15000);
    try {
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      return { exitCode, stdout, stderr };
    } finally {
      clearTimeout(timer);
    }
  }

  async function launcher(name, source) {
    const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
    const windows = process.platform === "win32";
    await writeFile(join(bin, name + (windows ? ".cmd" : "")), windows
      ? `@"${process.execPath}" "${source}" %*\n`
      : `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(source)} "$@"\n`,
      { mode: 0o755 });
  }

  async function linkScript(name) {
    await launcher(name, fileURLToPath(new URL(`../../src/mise-tasks/${name}.js`, import.meta.url)));
  }

  async function recordCommand(name) {
    const source = join(bin, `${name}.js`);
    await writeFile(source, `await Bun.write(${JSON.stringify(join(project, `${name}-args.json`))}, JSON.stringify(process.argv.slice(2)));\n`);
    await launcher(name, source);
  }

  return { root, project, config, run, linkScript, recordCommand, cleanup: () => rm(root, { recursive: true, force: true }) };
}
