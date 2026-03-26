#!/usr/bin/env bun
/**
 * Append to daily journal or open it. Port of default/bin/jrnl.
 */
import { appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { exists } from "./lib/fs.js";
import { readClipboard, readStdin } from "./lib/io.js";
import { home } from "./lib/env.js";
import { spawnSyncOrExit } from "./lib/shell.js";

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
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      clipboard: { type: "boolean", short: "c" },
      edit: { type: "boolean", short: "e" },
      path: { type: "boolean", short: "p" },
    },
  });

  const dir = await findJournalDir();
  if (!dir) {
    console.error("No journal directory found");
    process.exit(1);
  }
  const today = formatDate(new Date());
  const JOURNAL_FILE = join(dir, `Journal ${today}.md`);
  await ensureJournalFile(JOURNAL_FILE);

  if (values.path) {
    console.log(JOURNAL_FILE);
    return;
  }
  if (values.edit) {
    const editor = process.env.EDITOR || "nvim";
    const args = editor.includes("vim") ? ["+$", JOURNAL_FILE] : [JOURNAL_FILE];
    spawnSyncOrExit(editor, ...args);
    process.exit(0);
  }

  const title = positionals.join(" ");
  const time = new Date().toTimeString().slice(0, 5);

  const input = values.clipboard
    ? (await readClipboard()).trimEnd()
    : (await readStdin()).trimEnd();
  const body = input || title;
  const heading = input ? title : "";
  if (!body) {
    console.error("No input provided");
    process.exit(1);
  }
  const headingSuffix = heading ? ` ${heading}` : "";
  await appendFile(JOURNAL_FILE, `\n### ${time}${headingSuffix}\n\n${body}\n`);
  console.log(JOURNAL_FILE);
}

main();
