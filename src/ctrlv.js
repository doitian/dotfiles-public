#!/usr/bin/env bun
/**
 * Paste clipboard contents to stdout. Cross-platform.
 */
import { readClipboard } from "./lib/io.js";

process.stdout.write(await readClipboard());
