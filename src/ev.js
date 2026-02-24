#!/usr/bin/env bun
/**
 * ev – gopass entry/value helper.
 * 0 args: fzf to pick entry then field (PASS = password only), then run ev with those args.
 * 1 arg (entry): print entry password.
 * 2 args (entry, field): print line starting with "field: " (content after prefix).
 */
import { $ } from "bun";
import { gopassPassword, gopassFields } from "./lib/secrets.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
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
      console.log(`ev ${entryChoice} ${$.escape(fieldChoice)}`);
    } else {
      console.log(`ev ${entryChoice}`);
    }
  } else if (args.length === 1) {
    await Bun.stdout.write(await gopassPassword(args[0]));
  } else {
    const fields = await gopassFields(args[0]);
    const fieldValue = fields.get(args[1]);
    if (fieldValue) {
      await Bun.stdout.write(fieldValue);
    } else {
      console.error(`Field "${args[1]}" not found in entry`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
