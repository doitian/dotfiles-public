#!/usr/bin/env bun
/**
 * Copy stdin or file contents to clipboard. Cross-platform.
 */
import { writeClipboard } from "./lib/io.js";

const files = process.argv.slice(2);
if (files.length) {
  const chunks = [];
  for (const f of files) {
    chunks.push(await Bun.file(f).text());
  }
  await writeClipboard(chunks.join(""));
} else {
  await writeClipboard(process.stdin);
}
