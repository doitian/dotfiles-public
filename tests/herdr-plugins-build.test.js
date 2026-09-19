import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildHerdrPlugins } from "../scripts/build-herdr-plugins.js";

test("packages a runnable plugin and rebuilds when a local dependency changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "herdr plugin build "));
  try {
    const source = join(root, "herdr-plugins", "example");
    await mkdir(join(source, "lib"), { recursive: true });
    await Bun.write(join(source, "index.js"), 'import { value } from "./lib/value.js"; console.log(value);\n');
    const dependency = join(source, "lib", "value.js");
    await Bun.write(dependency, 'export const value = "first";\n');
    await Bun.write(join(source, "README.md"), "Example plugin\n");
    const manifest = 'id = "test.example"\n[[actions]]\nid = "run"\ncommand = ["./plugin", "argument with spaces"]\n';
    await Bun.write(join(source, "herdr-plugin.toml"), manifest);

    await buildHerdrPlugins(root);
    const output = join(root, "dist", "herdr-plugins", "example");
    const builtManifest = Bun.TOML.parse(await Bun.file(join(output, "herdr-plugin.toml")).text());
    const executable = process.platform === "win32" ? "plugin.exe" : "plugin";
    expect(builtManifest.actions[0].command).toEqual([`./${executable}`, "argument with spaces"]);
    expect(await Bun.file(join(output, "README.md")).text()).toBe("Example plugin\n");
    const binary = join(output, executable);
    const run = async () => {
      const child = Bun.spawn([binary], { cwd: root, stdout: "pipe", stderr: "pipe" });
      const stdout = await new Response(child.stdout).text();
      expect(await child.exited).toBe(0);
      return stdout.trim();
    };
    expect(await run()).toBe("first");

    const firstMtime = (await stat(binary)).mtimeMs;
    await buildHerdrPlugins(root);
    expect((await stat(binary)).mtimeMs).toBe(firstMtime);

    await Bun.write(dependency, 'export const value = "second";\n');
    await utimes(dependency, new Date(), new Date(firstMtime + 1000));
    await buildHerdrPlugins(root);
    expect(await run()).toBe("second");

    await rm(join(output, "herdr-plugin.toml"));
    await buildHerdrPlugins(root);
    expect(await Bun.file(join(output, "herdr-plugin.toml")).exists()).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30000);
