import { Glob, TOML } from "bun";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export async function buildHerdrPlugins(root = resolve(import.meta.dir, "..")) {
  const sourceRoot = join(root, "herdr-plugins");
  const executable = process.platform === "win32" ? "plugin.exe" : "plugin";
  const builderMtime = (await stat(import.meta.filename)).mtimeMs;

  for await (const manifestPath of new Glob("*/herdr-plugin.toml").scan(sourceRoot)) {
    const sourceDir = join(sourceRoot, dirname(manifestPath));
    const outputDir = join(root, "dist", "herdr-plugins", dirname(manifestPath));
    const outfile = join(outputDir, executable);
    const manifestSource = await Bun.file(join(sourceRoot, manifestPath)).text();
    const manifest = manifestSource.replaceAll('"./plugin"', JSON.stringify(`./${executable}`));
    const { id } = TOML.parse(manifest);
    let newestInput = builderMtime;
    for (const entry of await readdir(sourceDir, { recursive: true, withFileTypes: true })) {
      if (entry.isFile()) {
        newestInput = Math.max(newestInput, (await stat(join(entry.parentPath, entry.name))).mtimeMs);
      }
    }
    const outputMtime = await stat(outfile).then((value) => value.mtimeMs, (error) => {
      if (error.code === "ENOENT") return 0;
      throw error;
    });
    await mkdir(outputDir, { recursive: true });
    if (outputMtime < newestInput) {
      console.log(`Building Herdr plugin ${id} -> ${outputDir}`);
      const result = await Bun.build({
        entrypoints: [join(sourceDir, "index.js")],
        minify: true,
        compile: { outfile },
      });
      if (!result.success) throw new AggregateError(result.logs, `Failed to build ${sourceDir}`);
    }
    await Bun.write(join(outputDir, "herdr-plugin.toml"), manifest);
    const readme = join(sourceDir, "README.md");
    if (await Bun.file(readme).exists()) await copyFile(readme, join(outputDir, "README.md"));
  }
}

if (import.meta.main) await buildHerdrPlugins();
