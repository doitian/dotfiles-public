#!/usr/bin/env node
/**
 * Append to daily journal or open it. Port of default/bin/jrnl.
 */
import { appendFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { exists } from "./lib/fs.js";
import { home } from "./lib/env.js";
import { runInherit } from "./lib/run.js";

const JOURNAL_DIRS = [
  join(home(), "Dropbox", "Brain", "journal"),
  join(home(), "Brain", "journal"),
  join(home(), ".journal"),
];

async function findJournalDir() {
  for (const d of JOURNAL_DIRS) {
    if (await exists(d)) return d;
  }
  return null;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function tomorrow(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

function yesterday(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

async function ensureJournalFile(journalFile) {
  if (await exists(journalFile)) return;
  const date = journalFile.replace(/^.*\s([\d-]+)\.md$/, "$1");
  const content = `# Journal on ${formatDateLong(date)}

## Metadata

**Date**:: [[${date}]]
**Next**:: [[Journal ${tomorrow(date)}]]
**Prev**:: [[Journal ${yesterday(date)}]]
**Kind**:: #journal

## Journal
`;
  await writeFile(journalFile, content);
}

async function main() {
  const dir = await findJournalDir();
  if (!dir) {
    console.error("No journal directory found");
    process.exit(1);
  }
  const today = formatDate(new Date());
  const JOURNAL_FILE = join(dir, `Journal ${today}.md`);
  await ensureJournalFile(JOURNAL_FILE);

  const sepTitle = process.argv.slice(2).join(" ");
  if (sepTitle === "-p") {
    console.log(JOURNAL_FILE);
    return;
  }
  if (sepTitle === "-e") {
    const editor = process.env.EDITOR || "nvim";
    const code = await runInherit(editor, [JOURNAL_FILE]);
    process.exit(code ?? 0);
  }

  const titleSuffix = sepTitle ? ` ${sepTitle}` : "";
  const time = new Date().toTimeString().slice(0, 5);
  await appendFile(JOURNAL_FILE, `\n### ${time}${titleSuffix}\n\n`);
  const w = createWriteStream(JOURNAL_FILE, { flags: "a" });
  process.stdin.pipe(w);
  w.on("finish", async () => {
    await appendFile(JOURNAL_FILE, "\n");
    console.log(JOURNAL_FILE);
  });
}

main();
