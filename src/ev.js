#!/usr/bin/env bun
/**
 * ev – gopass entry/value helper.
 * 0 args: fzf to pick entry then field (PASS = password only), then run ev with those args.
 * 1 arg (entry): print entry password.
 * 2 args (entry, field): print line starting with "field: " (content after prefix).
 */
import { parseArgs } from "node:util";
import { $ } from "bun";
import { gopassPassword, gopassFields } from "./lib/secrets.js";
import { writeClipboard } from "./lib/io.js";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      clipboard: { type: "boolean", short: "c" },
    },
  });

  if (positionals.length === 0) {
    process.env.GPG_TTY =
      process.env.GPG_TTY || (process.platform !== "win32" ? "/dev/tty" : "");

    const entryChoice = (await $`gopass list -f | fzf`.text()).trim();
    if (!entryChoice) return;

    const fieldChoiceFzf = Bun.spawn(["fzf"], { stdin: "pipe" });
    fieldChoiceFzf.stdin.write("PASS\n");
    fieldChoiceFzf.stdin.write(Array.from((await gopassFields(entryChoice)).keys()).join("\n"));
    fieldChoiceFzf.stdin.end();

    const fieldChoice = (await fieldChoiceFzf.stdout.text()).trim();

    if (fieldChoice && fieldChoice !== "PASS") {
      const cmd = `ev ${entryChoice} ${$.escape(fieldChoice)}`;
      console.log(cmd);
      if (values.clipboard) await writeClipboard(cmd);
    } else {
      const cmd = `ev ${entryChoice}`;
      console.log(cmd);
      if (values.clipboard) await writeClipboard(cmd);
    }
  } else if (positionals.length === 1) {
    const output = await gopassPassword(positionals[0]);
    await Bun.stdout.write(output);
    if (values.clipboard) await writeClipboard(output);
  } else {
    const fields = await gopassFields(positionals[0]);
    const fieldValue = fields.get(positionals[1]);
    if (fieldValue) {
      await Bun.stdout.write(fieldValue);
      if (values.clipboard) await writeClipboard(fieldValue);
    } else {
      console.error(`Field "${positionals[1]}" not found in entry`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
