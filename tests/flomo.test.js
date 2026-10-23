import { describe, expect, test } from "bun:test";
import { formatMemo, formatMemos, parseArgs, run } from "../src/flomo.js";

const memo = {
  id: "MjYxODE0ODc0",
  content: "flomo yearly 299 CNY #ledger/done",
  content_truncated: false,
  created_at: "2026-10-20T11:11:52+08:00",
  updated_at: "2026-10-20T11:27:04+08:00",
  from: "ai",
  tags: ["ledger/done", "profession"],
  has_image: false,
  has_link: false,
  has_voice: false,
  files: [],
  linked_memos: [],
  word_count: 53,
  url: "https://v.flomoapp.com/mine/?memo_id=MjYxODE0ODc0",
};

function fixture(results = {}) {
  const calls = [];
  let output = "";
  const client = {
    callTool: async (name, args) => {
      calls.push({ name, args });
      const result = results[name];
      if (result instanceof Error) throw result;
      return result ?? { memos: [memo] };
    },
    listTools: async () => [{ name: "memo_search", description: "搜索笔记\n第二行" }],
  };
  return {
    calls,
    text: () => output,
    run: (argv, { stdin = "" } = {}) => run(argv, {
      client,
      readInput: async () => stdin,
      output: { write: chunk => { output += chunk; } },
    }),
  };
}

describe("parseArgs", () => {
  test("bare content means create", () => {
    expect(parseArgs(["hello", "#tag"])).toMatchObject({ command: "create", args: ["hello", "#tag"] });
  });

  test("known command is split from args", () => {
    const parsed = parseArgs(["search", "x", "--limit", "3", "--untagged"]);
    expect(parsed.command).toBe("search");
    expect(parsed.args).toEqual(["x"]);
    expect(parsed.values.limit).toBe("3");
    expect(parsed.values.untagged).toBe(true);
  });
});

describe("formatting", () => {
  test("formatMemo renders meta, content and url", () => {
    expect(formatMemo(memo)).toBe([
      "── MjYxODE0ODc0 · 2026-10-20 11:11 · #ledger/done · #profession",
      "flomo yearly 299 CNY #ledger/done",
      "https://v.flomoapp.com/mine/?memo_id=MjYxODE0ODc0",
    ].join("\n"));
  });

  test("formatMemos handles arrays, empty results and batch omissions", () => {
    expect(formatMemos([])).toBe("No memos found.");
    expect(formatMemos({ memos: [], truncated: false, omitted_ids: [] })).toBe("No memos found.");
    const text = formatMemos({ memos: [memo], truncated: true, omitted_ids: ["A", "B"] });
    expect(text).toContain("flomo get A B");
  });

  test("truncated content points at flomo get", () => {
    const text = formatMemo({ ...memo, content_truncated: true, word_count: 5000 });
    expect(text).toContain("run: flomo get MjYxODE0ODc0");
  });
});

describe("create", () => {
  test("no args reads markdown from stdin", async () => {
    const f = fixture({ memo_create: { id: "NEW", word_count: 4, url: "https://x" } });
    await f.run([], { stdin: "#ideas\nhello **world**\n" });
    expect(f.calls).toEqual([{ name: "memo_create", args: { content: "#ideas\nhello **world**" } }]);
    expect(f.text()).toBe("created NEW · 4 words\nhttps://x\n");
  });

  test("args and stdin are combined", async () => {
    const f = fixture({ memo_create: { id: "NEW", word_count: 9 } });
    await f.run(["#til"], { stdin: "piped body" });
    expect(f.calls[0].args).toEqual({ content: "#til\n\npiped body" });
  });

  test("empty input creates nothing", async () => {
    const f = fixture();
    await f.run([]);
    await f.run([], { stdin: "  \n\t" });
    expect(f.calls).toEqual([]);
    expect(f.text()).toBe("");
  });

  test("--json prints raw result", async () => {
    const f = fixture({ memo_create: { id: "NEW", word_count: 1 } });
    await f.run(["hi", "--json"]);
    expect(JSON.parse(f.text())).toEqual({ id: "NEW", word_count: 1 });
  });
});

describe("update", () => {
  test("passes id and content", async () => {
    const f = fixture({ memo_update: { id: "ID", word_count: 2 } });
    await f.run(["update", "ID", "fresh", "text"]);
    expect(f.calls).toEqual([{ name: "memo_update", args: { id: "ID", content: "fresh text" } }]);
    expect(f.text()).toContain("updated ID");
  });

  test("missing id fails", async () => {
    const f = fixture();
    await expect(f.run(["update"])).rejects.toThrow("Usage: flomo update");
  });
});

describe("search", () => {
  test("no keywords lists recent memos", async () => {
    const f = fixture();
    await f.run(["search"]);
    expect(f.calls).toEqual([{ name: "memo_search", args: {} }]);
    expect(f.text()).toContain("flomo yearly 299 CNY");
  });

  test("options map to snake_case arguments", async () => {
    const f = fixture();
    await f.run([
      "search", "a", "b",
      "--tag", "ledger", "--start-date", "2026-01-01", "--end-date", "2026-02-01",
      "--from", "ai", "--original-only", "--untagged", "--limit", "5",
    ]);
    expect(f.calls[0].args).toEqual({
      keywords: "a b",
      tag: "ledger",
      start_date: "2026-01-01",
      end_date: "2026-02-01",
      from: "ai",
      original_only: true,
      has_tag: false,
      limit: 5,
    });
  });

  test("invalid limit is rejected", async () => {
    const f = fixture();
    await expect(f.run(["search", "--limit", "x"])).rejects.toThrow("--limit");
  });
});

describe("other commands", () => {
  test("get batches ids", async () => {
    const f = fixture({ memo_batch_get: { memos: [memo], truncated: false, omitted_ids: [] } });
    await f.run(["get", "A", "B"]);
    expect(f.calls).toEqual([{ name: "memo_batch_get", args: { ids: ["A", "B"] } }]);
  });

  test("tags prints one per line", async () => {
    const f = fixture({ tag_tree: { tags: ["ledger", "ledger/done"], total: 2, returned: 2, truncated: false } });
    await f.run(["tags", "ledger", "--depth", "2"]);
    expect(f.calls[0].args).toEqual({ prefix: "ledger", depth: 2 });
    expect(f.text()).toBe("ledger\nledger/done\n");
  });

  test("tag-rename summarizes the batch", async () => {
    const f = fixture({
      tag_rename: { old_tag: "a", new_tag: "b", matched_memos: 3, updated_memos: 3, updated_tags: 1, warnings: ["w"] },
    });
    await f.run(["tag-rename", "a", "b", "--max-memos", "10"]);
    expect(f.calls[0].args).toEqual({ old_tag: "a", new_tag: "b", max_memos: 10 });
    expect(f.text()).toContain("renamed #a → #b: 3/3 memos, 1 tags\nw");
  });

  test("memory prints the document content", async () => {
    const f = fixture({ memory_context: { content: "user likes tests" } });
    await f.run(["memory"]);
    expect(f.text()).toBe("user likes tests\n");
  });

  test("tools lists names with the first description line", async () => {
    const f = fixture();
    await f.run(["tools"]);
    expect(f.text()).toBe("memo_search\t搜索笔记\n");
  });

  test("call passes JSON arguments and prints the result", async () => {
    const f = fixture({ memo_search: { memos: [] } });
    await f.run(["call", "memo_search", "{\"limit\":1}"]);
    expect(f.calls).toEqual([{ name: "memo_search", args: { limit: 1 } }]);
    expect(JSON.parse(f.text())).toEqual({ memos: [] });
  });

  test("help prints usage without a client", async () => {
    let output = "";
    await run(["--help"], { output: { write: chunk => { output += chunk; } } });
    expect(output).toContain("Usage: flomo");
  });
});
