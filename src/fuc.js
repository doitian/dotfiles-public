#!/usr/bin/env bun
/**
 * Fuzzy-find Unicode characters. Port of default/bin/fuc.
 */
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { parseArgs } from "node:util";
import { $ } from "bun";
import { exists } from "./lib/fs.js";
import { home } from "./lib/env.js";
import { writeClipboard } from "./lib/io.js";

const UNICODES_URL =
  "https://www.unicode.org/Public/UCA/latest/allkeys.txt";

async function main() {
  const reposDir = join(home(), ".dotfiles", "repos");
  const unicodesPath = join(reposDir, "unicodes.txt");

  if (!(await exists(unicodesPath))) {
    await mkdir(reposDir, { recursive: true });
    const resp = await fetch(UNICODES_URL);
    if (!resp.ok) {
      console.error(`Failed to download unicodes.txt: ${resp.status}`);
      process.exit(1);
    }
    const raw = await resp.text();
    const filtered = raw
      .split(/\r?\n|\r/)
      .filter((l) => l !== "" && !l.startsWith("#") && !l.startsWith("@"))
      .map((l) => {
        const m = l.replace(/; [^ ]+ #/, "#");
        const hex = m.replace(/ *#.*/, "").trim();
        if (!hex) return m;
        const codes = hex.split(/\s+/).map((h) => parseInt(h, 16));
        const visible = codes.every(
          (c) => c > 0x20 && c !== 0x7f && !(c >= 0x80 && c <= 0x9f) && !/\s/.test(String.fromCodePoint(c)),
        );
        if (!visible) return m;
        const preview = codes.map((c) => String.fromCodePoint(c)).join("");
        return m.replace("#", `# ${preview}`);
      })
      .join("\n");
    await Bun.write(unicodesPath, filtered + "\n");
  }

  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      clipboard: { type: "boolean", short: "c" },
    },
  });

  const query = positionals.join(" ");
  const fzfArgs = ["fzf"];
  if (query) fzfArgs.push("--query", query);
  const fzfProc = Bun.spawn(fzfArgs, {
    stdin: Bun.file(unicodesPath),
    stdout: "pipe",
    stderr: "inherit",
  });
  const code = await fzfProc.exited;
  if (code !== 0) process.exit(code);
  const selected = (await new Response(fzfProc.stdout).text()).trim();
  if (!selected) process.exit(1);

  const hex = selected.replace(/ *#.*/, "").trim();
  const chars = hex.split(/\s+/).map((h) => String.fromCodePoint(parseInt(h, 16)));
  const output = chars.join("") + "\n";
  process.stdout.write(output);
  if (values.clipboard) await writeClipboard(output.trimEnd());
}

main();
