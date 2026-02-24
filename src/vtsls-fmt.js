#!/usr/bin/env bun
/**
 * Format JavaScript/TypeScript files using the vtsls language server.
 * Usage: vtsls-fmt <file>...
 *
 * Spawns vtsls over stdio, sends textDocument/formatting for each file,
 * and writes the result back. Reads .editorconfig for indentation settings.
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Glob } from "bun";

const USAGE = `Usage: vtsls-fmt <file|dir>...

Format JavaScript/TypeScript files using the vtsls language server.
When a directory is given, all supported files in it are formatted recursively.

Options:
  -h, --help  Show this help`;

const LANG_IDS = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".jsx": "javascriptreact",
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".tsx": "typescriptreact",
};

const SUPPORTED_EXTS = new Set(Object.keys(LANG_IDS));

const GLOB_PATTERN = `**/*{${[...SUPPORTED_EXTS].join(",")}}`;

/** Expand a list of files/dirs into resolved file paths with supported extensions. */
async function expandPaths(paths) {
  const files = [];
  for (const p of paths) {
    const abs = resolve(p);
    const st = statSync(abs, { throwIfNoEntry: false });
    if (!st) continue;
    if (st.isFile()) {
      files.push(abs);
    } else if (st.isDirectory()) {
      const glob = new Glob(GLOB_PATTERN);
      for await (const match of glob.scan({ cwd: abs, absolute: true })) {
        files.push(match);
      }
    }
  }
  return files;
}

function parseCliArgs() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  if (positionals.length === 0) {
    console.error(USAGE);
    process.exit(1);
  }
  return { files: positionals.map((f) => resolve(f)) };
}

// ---------------------------------------------------------------------------
// LSP JSON-RPC transport over stdio
// ---------------------------------------------------------------------------

function createLspClient(proc) {
  let buffer = Buffer.alloc(0);
  const pending = new Map();
  let nextId = 1;

  function send(msg) {
    const body = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`;
    proc.stdin.write(header + body);
  }

  function drain() {
    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;
      const header = buffer.subarray(0, headerEnd).toString();
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) break;
      const len = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + len) break;
      const body = JSON.parse(
        buffer.subarray(bodyStart, bodyStart + len).toString(),
      );
      buffer = buffer.subarray(bodyStart + len);
      if (body.id !== undefined && pending.has(body.id)) {
        pending.get(body.id)(body.result ?? null);
        pending.delete(body.id);
      }
    }
  }

  // Read stdout in background (Bun spawn returns a ReadableStream).
  (async () => {
    const reader = proc.stdout.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer = Buffer.concat([buffer, value]);
      drain();
    }
  })();

  function request(method, params) {
    const id = nextId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      send({ jsonrpc: "2.0", id, method, params });
    });
  }

  function notify(method, params) {
    send({ jsonrpc: "2.0", method, params });
  }

  return { request, notify };
}

// ---------------------------------------------------------------------------
// Text-edit helpers
// ---------------------------------------------------------------------------

/** Apply LSP TextEdits to a string, returning the new string. */
function applyEdits(text, edits) {
  const lines = text.split("\n");
  // Sort edits bottom-to-top so earlier positions stay valid.
  const sorted = [...edits].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line)
      return b.range.start.line - a.range.start.line;
    return b.range.start.character - a.range.start.character;
  });
  for (const edit of sorted) {
    const { start, end } = edit.range;
    const prefix = (lines[start.line] ?? "").substring(0, start.character);
    const suffix = (lines[end.line] ?? "").substring(end.character);
    const replacement = (prefix + edit.newText + suffix).split("\n");
    lines.splice(start.line, end.line - start.line + 1, ...replacement);
  }
  return lines.join("\n");
}

function languageId(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf("."));
  return LANG_IDS[ext] ?? "javascript";
}

// ---------------------------------------------------------------------------
// Editorconfig
// ---------------------------------------------------------------------------

/** Query the editorconfig CLI for indent settings per file. */
async function queryEditorconfig(files) {
  const defaults = { tabSize: 4, insertSpaces: true };
  const bin = Bun.which("editorconfig");
  if (!bin) return new Map(files.map((f) => [f, defaults]));

  const proc = Bun.spawn([bin, ...files], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const raw = await new Response(proc.stdout).text();
  await proc.exited;

  const result = new Map();
  let currentPath = null;
  let indentStyle = null;
  let indentSize = null;
  let tabWidth = null;

  function flush() {
    if (!currentPath) return;
    const useTabs = indentStyle === "tab";
    const size = useTabs
      ? (tabWidth ?? indentSize ?? defaults.tabSize)
      : (indentSize ?? defaults.tabSize);
    result.set(currentPath, { tabSize: size, insertSpaces: !useTabs });
    indentStyle = null;
    indentSize = null;
    tabWidth = null;
  }

  for (const line of raw.split(/\r?\n/)) {
    const hdr = line.match(/^\[(.+)\]$/);
    if (hdr) {
      flush();
      currentPath = hdr[1];
      continue;
    }
    if (!currentPath) continue;
    const [key, val] = line.split("=", 2).map((s) => s.trim());
    if (key === "indent_style") indentStyle = val;
    else if (key === "indent_size" && val !== "tab") indentSize = parseInt(val, 10) || null;
    else if (key === "tab_width") tabWidth = parseInt(val, 10) || null;
  }
  flush();
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { files } = parseCliArgs();
  const expanded = await expandPaths(files);

  const vtslsBin = Bun.which("vtsls");
  if (!vtslsBin) {
    console.error("vtsls not found on PATH");
    process.exit(1);
  }

  if (expanded.length === 0) return;

  const editorconfigs = await queryEditorconfig(expanded);

  const proc = Bun.spawn([vtslsBin, "--stdio"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "ignore",
  });

  const lsp = createLspClient(proc);

  await lsp.request("initialize", {
    processId: process.pid,
    rootUri: `file://${process.cwd()}`,
    capabilities: {},
  });
  lsp.notify("initialized", {});

  for (const filePath of expanded) {
    const uri = `file://${filePath}`;
    const text = readFileSync(filePath, "utf-8");
    const langId = languageId(filePath);

    lsp.notify("textDocument/didOpen", {
      textDocument: { uri, languageId: langId, version: 1, text },
    });

    const fmtOpts = editorconfigs.get(filePath) ?? { tabSize: 4, insertSpaces: true };

    const edits = await lsp.request("textDocument/formatting", {
      textDocument: { uri },
      options: fmtOpts,
    });

    if (edits && edits.length > 0) {
      const formatted = applyEdits(text, edits);
      if (formatted !== text) {
        writeFileSync(filePath, formatted);
        console.log(`formatted: ${filePath.replace(process.cwd() + "/", "")}`);
      }
    }

    lsp.notify("textDocument/didClose", { textDocument: { uri } });
  }

  await lsp.request("shutdown", null);
  lsp.notify("exit", null);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
