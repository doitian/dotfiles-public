#!/usr/bin/env bun
/**
 * ev – gopass entry/value helper.
 * 0 args: fzf to pick entry then field (PASS = password only), then run ev with those args.
 * 1 arg (entry): print entry password.
 * 2 args (entry, field): print line starting with "field: " (content after prefix).
 */
import { $ } from "bun";

async function getFields(entry) {
    const map = new Map();
    for await (const line of $`gopass show -f ${entry}`.lines()) {
        const idx = line.indexOf(": ");
        if (idx !== -1) {
            map.set(line.slice(0, idx), line.slice(idx + 2).trim());
        }
    }
    return map;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        process.env.GPG_TTY = process.env.GPG_TTY || (process.platform !== "win32" ? "/dev/tty" : "");

        const entryChoice = (await $`gopass list -f | fzf`.text()).trim();
        if (!entryChoice) return;

        const fieldNames = new Response(["PASS", ...(await getFields(entryChoice)).keys()].join("\n"));
        const fieldChoice = (await $`fzf < ${fieldNames}`.text()).trim();

        if (fieldChoice && fieldChoice !== "PASS") {
            console.log(`ev ${entryChoice} ${$.escape(fieldChoice)}`);
        } else {
            console.log(`ev ${entryChoice}`);
        }
    } else if (args.length === 1) {
        Bun.stdout.write(await $`gopass show -o ${args[0]}`.arrayBuffer());
    } else {
        const fields = await getFields(args[0]);
        const fieldValue = fields.get(args[1]);
        if (fieldValue) {
            Bun.stdout.write(fieldValue);
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
