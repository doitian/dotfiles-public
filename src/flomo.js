#!/usr/bin/env bun
/**
 * flomo CLI over the flomo MCP API (https://flomoapp.com/mcp).
 *
 * `flomo [content...]` creates a memo, reading Markdown from stdin when no
 * content arguments are given. Other subcommands search, read, update and
 * organize memos and tags. Token resolution: FLOMO_MCP_TOKEN env, then the OS
 * keyring, then an interactive prompt (stored for later runs).
 */
import { parseArgs as parseArgsUtil } from "node:util";
import { loadFileContent, prependToInput } from "./lib/ai-input.js";
import { readStdin } from "./lib/io.js";
import { McpHttpClient } from "./lib/mcp.js";
import { getSecret } from "./lib/secrets.js";

const ENDPOINT = "https://flomoapp.com/mcp";

const USAGE = `Usage: flomo <command> [options]

Capture and query flomo memos via the flomo MCP API.

Create & update:
  flomo [content...]            Create a memo; reads Markdown from stdin when no args
  flomo create [content...]     Same as above (-f/--file reads content from a file)
  flomo update <id> [content...]  Replace a memo's content (args, -f, or stdin)

Read:
  flomo search [keywords...]    Search memos (AND keywords); no keywords lists recent memos
    --tag <tag>                 Only memos with this tag
    --start-date <YYYY-MM-DD>   Created on/after this date
    --end-date <YYYY-MM-DD>     Created on/before this date
    --limit <n>                 Max results (server max 50)
    --from <source>             Only memos from this source
    --original-only             Exclude non-original memos
    --has-tag / --untagged      Only tagged / only untagged memos
  flomo get <id...>             Fetch full memos by id (up to 10)
  flomo related <id>            Memos related to a memo (--limit, --no-same-tag)
  flomo review                  Today's daily review

Tags & memory:
  flomo tags [prefix]           Tag tree (--depth, --limit)
  flomo tag-search <keywords>   Find tags by keyword (--limit)
  flomo tag-rename <old> <new>  Rename a tag everywhere (--max-memos confirms large batches)
  flomo memory                  Memory document (memory.md)
  flomo profile                 User profile document (user.md)

Other:
  flomo guides                  Memo format + tag best-practice guides
  flomo tools                   List available MCP tools
  flomo call <tool> [json]      Call an arbitrary tool with JSON arguments

Global:
  --json                        Print raw JSON instead of formatted output
  -h, --help                    Show this help

Environment: FLOMO_MCP_TOKEN (else OS keyring / prompt), FLOMO_MCP_ENDPOINT.
`;

const COMMANDS = new Set([
  "create", "update", "search", "get", "related", "review",
  "tags", "tag-search", "tag-rename", "memory", "profile",
  "guides", "tools", "call",
]);

export function parseArgs(argv) {
  const { values, positionals } = parseArgsUtil({
    args: argv,
    allowPositionals: true,
    options: {
      file: { type: "string", short: "f" },
      help: { type: "boolean", short: "h" },
      json: { type: "boolean" },
      tag: { type: "string" },
      "start-date": { type: "string" },
      "end-date": { type: "string" },
      from: { type: "string" },
      limit: { type: "string" },
      depth: { type: "string" },
      "max-memos": { type: "string" },
      "original-only": { type: "boolean" },
      "has-tag": { type: "boolean" },
      untagged: { type: "boolean" },
      "no-same-tag": { type: "boolean" },
    },
  });
  if (values.help) return { help: true };
  const [first, ...rest] = positionals;
  const command = first && COMMANDS.has(first) ? first : "create";
  const args = command === "create" ? positionals : rest;
  return { command, args, values };
}

function integer(value, name) {
  if (value == null) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`--${name} must be a non-negative integer`);
  return n;
}

function formatTime(iso) {
  return String(iso ?? "").replace("T", " ").slice(0, 16);
}

export function formatMemo(memo) {
  const meta = [
    memo.id,
    formatTime(memo.created_at),
    ...(memo.tags ?? []).map(tag => `#${tag}`),
  ].filter(Boolean).join(" · ");
  const lines = [`── ${meta}`];
  if (memo.content) lines.push(memo.content);
  if (memo.content_truncated) {
    lines.push(`[truncated — ${memo.word_count} chars total; run: flomo get ${memo.id}]`);
  }
  if (memo.url) lines.push(memo.url);
  return lines.join("\n");
}

function memoList(data) {
  return Array.isArray(data) ? data : (data?.memos ?? []);
}

export function formatMemos(data) {
  const memos = memoList(data);
  if (!memos.length) return "No memos found.";
  const parts = memos.map(formatMemo);
  if (!Array.isArray(data)) {
    if (data?.truncated && data.omitted_ids?.length) {
      parts.push(`[more omitted; run: flomo get ${data.omitted_ids.join(" ")}]`);
    }
  }
  return parts.join("\n\n");
}

function formatWritten(verb, memo) {
  return [`${verb} ${memo.id} · ${memo.word_count ?? "?"} words`, memo.url]
    .filter(Boolean)
    .join("\n");
}

export async function createClient(env = process.env, fetchImpl = fetch) {
  const token = await getSecret("flomo-mcp-token", "FLOMO_MCP_TOKEN");
  const client = new McpHttpClient({
    url: env.FLOMO_MCP_ENDPOINT || ENDPOINT,
    token,
    fetchImpl,
  });
  await client.connect();
  return client;
}

async function readContent(values, prefix, readInput) {
  const fileContent = await loadFileContent(values.file);
  const stdin = values.file === "-" ? "" : await readInput();
  const content = prependToInput(prefix, fileContent, stdin).trim();
  if (!content) throw new Error("Memo content is empty (pass args, -f/--file, or pipe stdin).");
  return content;
}

export async function run(argv, {
  env = process.env,
  client = null,
  output = process.stdout,
  readInput = async () => (process.stdin.isTTY ? "" : await readStdin()),
} = {}) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    await output.write(`${USAGE.trim()}\n`);
    return;
  }
  const { command, args, values } = parsed;
  const api = client ?? await createClient(env);
  const print = async data => {
    if (values.json || typeof data !== "string") data = JSON.stringify(data, null, 2);
    await output.write(`${data}\n`);
  };
  const printMemos = data => print(values.json ? data : formatMemos(data));

  switch (command) {
    case "create": {
      const content = await readContent(values, args.join(" "), readInput);
      const memo = await api.callTool("memo_create", { content });
      await print(values.json ? memo : formatWritten("created", memo));
      break;
    }
    case "update": {
      const [id, ...rest] = args;
      if (!id) throw new Error("Usage: flomo update <id> [content...]");
      const content = await readContent(values, rest.join(" "), readInput);
      const memo = await api.callTool("memo_update", { id, content });
      await print(values.json ? memo : formatWritten("updated", memo));
      break;
    }
    case "search": {
      const keywords = args.join(" ").trim();
      const data = await api.callTool("memo_search", {
        ...(keywords && { keywords }),
        ...(values.tag && { tag: values.tag }),
        ...(values["start-date"] && { start_date: values["start-date"] }),
        ...(values["end-date"] && { end_date: values["end-date"] }),
        ...(values.from && { from: values.from }),
        ...(values["original-only"] && { original_only: true }),
        ...(values["has-tag"] && { has_tag: true }),
        ...(values.untagged && { has_tag: false }),
        ...(values.limit != null && { limit: integer(values.limit, "limit") }),
      });
      await printMemos(data);
      break;
    }
    case "get": {
      if (!args.length) throw new Error("Usage: flomo get <id...>");
      const data = await api.callTool("memo_batch_get", { ids: args });
      await printMemos(data);
      break;
    }
    case "related": {
      const [id] = args;
      if (!id) throw new Error("Usage: flomo related <id>");
      const data = await api.callTool("memo_recommended", {
        id,
        ...(values.limit != null && { limit: integer(values.limit, "limit") }),
        ...(values["no-same-tag"] && { no_same_tag: true }),
      });
      await printMemos(data);
      break;
    }
    case "review": {
      await printMemos(await api.callTool("get_daily_review"));
      break;
    }
    case "tags": {
      const data = await api.callTool("tag_tree", {
        ...(args[0] && { prefix: args[0] }),
        ...(values.depth != null && { depth: integer(values.depth, "depth") }),
        ...(values.limit != null && { limit: integer(values.limit, "limit") }),
      });
      if (values.json) await print(data);
      else {
        await print((data?.tags ?? []).join("\n") || "No tags found.");
        if (data?.truncated) {
          process.stderr.write(`[truncated: ${data.returned}/${data.total} tags; use --limit or a prefix]\n`);
        }
      }
      break;
    }
    case "tag-search": {
      const keywords = args.join(" ").trim();
      if (!keywords) throw new Error("Usage: flomo tag-search <keywords>");
      const data = await api.callTool("tag_search", {
        keywords,
        ...(values.limit != null && { limit: integer(values.limit, "limit") }),
      });
      await print(values.json ? data : (memoList(data).map(tag => tag.name ?? tag).join("\n") || "No tags found."));
      break;
    }
    case "tag-rename": {
      const [oldTag, newTag] = args;
      if (!oldTag || !newTag) throw new Error("Usage: flomo tag-rename <old> <new>");
      const data = await api.callTool("tag_rename", {
        old_tag: oldTag,
        new_tag: newTag,
        ...(values["max-memos"] != null && { max_memos: integer(values["max-memos"], "max-memos") }),
      });
      await print(values.json ? data : [
        `renamed #${data.old_tag} → #${data.new_tag}: ${data.updated_memos}/${data.matched_memos} memos, ${data.updated_tags} tags`,
        ...(data.warnings ?? []),
      ].join("\n"));
      break;
    }
    case "memory":
    case "profile": {
      const data = await api.callTool(command === "memory" ? "memory_context" : "memory_user");
      await print(values.json ? data : (data?.content ?? ""));
      break;
    }
    case "guides": {
      const [format, tag] = await Promise.all([
        api.callTool("get_format_guide"),
        api.callTool("get_tag_guide"),
      ]);
      if (values.json) await print({ format, tag });
      else await print(`${format?.content ?? ""}\n\n${tag?.content ?? ""}`);
      break;
    }
    case "tools": {
      const tools = await api.listTools();
      await print(values.json ? tools : tools.map(tool => `${tool.name}\t${(tool.description ?? "").split("\n")[0]}`).join("\n"));
      break;
    }
    case "call": {
      const [tool, json = "{}"] = args;
      if (!tool) throw new Error("Usage: flomo call <tool> [json]");
      await print(await api.callTool(tool, JSON.parse(json)));
      break;
    }
  }
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  await run(argv, deps);
}

if (import.meta.main || Bun.isStandaloneExecutable) main().catch(error => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
