#!/usr/bin/env bun
/**
 * Merge spell/dictionary files (Harper, vim, Windows, Obsidian) and sync to all locations.
 * Merged from sync-spell.ps1 and default/bin/sync-spell.
 *
 * With --from-vim: use ~/.vim-spell-en.utf-8.add as the sole source of truth.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { exists } from "./lib/fs.js";
import { home } from "./lib/env.js";

const isWin = process.platform === "win32";

const VIM_SPELL = join(home(), ".vim-spell-en.utf-8.add");
const DICT_FILES = [
  join(home(), ".config", "harper-ls", "dictionary.txt"),
  join(home(), "Dropbox", "Apps", "Harper", "dictionary.txt"),
  VIM_SPELL,
];
const WIN_DIC = join(
  home(),
  "AppData",
  "Roaming",
  "Microsoft",
  "Spelling",
  "neutral",
  "default.dic",
);
const OBSIDIAN_HARPER = join(
  home(),
  "Dropbox",
  "Brain",
  ".obsidian",
  "plugins",
  "harper",
  "data.json",
);

const USAGE = `Usage: sync-spell [options]

Merge spell/dictionary files and sync to all locations.

Options:
  --from-vim   Use ~/.vim-spell-en.utf-8.add as the sole source of truth
  -h, --help   Show this help
`;

function parseCli() {
  const { values } = parseArgs({
    options: {
      "from-vim": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log(USAGE.trim());
    process.exit(0);
  }
  return { fromVim: values["from-vim"] };
}

async function readLines(path) {
  if (!(await exists(path))) return [];
  const raw = await readFile(path, "utf8");
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const { fromVim } = parseCli();
  const merged = new Set();

  if (fromVim) {
    for (const line of await readLines(VIM_SPELL)) merged.add(line);
  } else {
    for (const file of DICT_FILES) {
      for (const line of await readLines(file)) merged.add(line);
    }

    if (isWin && (await exists(WIN_DIC))) {
      const content = await readFile(WIN_DIC, "utf16le");
      const words = content
        .replace(/\uFEFF/, "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const w of words) merged.add(w);
    }
  }

  let obsidianLoaded = false;
  let obsidianData = null;
  if (await exists(OBSIDIAN_HARPER)) {
    try {
      obsidianData = JSON.parse(await readFile(OBSIDIAN_HARPER, "utf8"));
      if (!fromVim) {
        const arr = obsidianData.userDictionary;
        if (Array.isArray(arr)) for (const w of arr) merged.add(w);
      }
      obsidianLoaded = true;
    } catch (_) { }
  }

  const sorted = [...merged].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "variant" }),
  );
  const outText = sorted.join("\n") + (sorted.length ? "\n" : "");

  for (const file of DICT_FILES) {
    const dir = join(file, "..");
    if (await exists(dir)) {
      await writeFile(file, outText, "utf8");
      console.log("Synchronized", file);
    }
  }

  if (isWin && (await exists(join(WIN_DIC, "..")))) {
    await mkdir(join(WIN_DIC, ".."), { recursive: true });
    const bom = "\uFEFF";
    await writeFile(
      WIN_DIC,
      bom + sorted.join("\r\n") + (sorted.length ? "\r\n" : ""),
      "utf16le",
    );
    console.log("Synchronized", WIN_DIC);
  }

  if (obsidianLoaded && obsidianData) {
    obsidianData.userDictionary = sorted;
    await writeFile(
      OBSIDIAN_HARPER,
      JSON.stringify(obsidianData, null, 2) + "\n",
      "utf8",
    );
    console.log("Synchronized", OBSIDIAN_HARPER);
  }

  console.log("Synchronization complete.");
}

main();
