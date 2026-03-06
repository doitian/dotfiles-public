#!/usr/bin/env bun
/**
 * Google Tasks CLI — renders tasks as markdown.
 * Subcommands:
 *   list  — list tasks as a markdown todo list
 */
import { $ } from "bun";

const DEFAULT_TASKLIST = "MDU1MzI1ODE0MTg3NzMzOTg0MTA6MDow";

async function fetchTasks(tasklist) {
  const params = JSON.stringify({ tasklist });
  const data = await $`gws tasks tasks list --params ${params}`.json();
  return data.items ?? [];
}

/**
 * Build a markdown todo list string from flat task items,
 * nesting children under their parent.
 * @param {object[]} items
 * @returns {string}
 */
function renderMarkdown(items) {
  // Index items by id
  const byId = new Map(items.map((t) => [t.id, t]));

  // Group children under parent
  /** @type {Map<string|null, object[]>} */
  const children = new Map();
  for (const t of items) {
    const pid = t.parent ?? null;
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid).push(t);
  }

  const lines = [];

  /**
   * Recursively render a task and its children.
   * @param {object} task
   * @param {number} depth — indentation level (0 = top)
   */
  function render(task, depth) {
    const indent = "  ".repeat(depth);
    const checked = task.status === "completed" ? "x" : " ";
    let line = `${indent}- [${checked}] ${task.title}`;
    if (task.notes) {
      const notesLines = task.notes.split("\n");
      const first = notesLines[0];
      try {
        const url = new URL(first);
        const host = url.hostname.replace(/^www\./, "");
        notesLines[0] = `[${host}](${first})`;
      } catch (_) {
        // not a URL, keep as-is
      }
      line += `\n${indent}  ${notesLines.join(`\n${indent}  `)}`;
    }
    lines.push(line);
    for (const child of children.get(task.id) ?? []) {
      render(child, depth + 1);
    }
  }

  // Render top-level tasks (no parent)
  for (const task of children.get(null) ?? []) {
    render(task, 0);
  }

  return lines.join("\n");
}

// --- CLI ---
const [subcommand] = process.argv.slice(2);

if (subcommand === "list") {
  const tasklist = process.argv[3] || DEFAULT_TASKLIST;
  const items = await fetchTasks(tasklist);
  const md = renderMarkdown(items);
  if (process.stdout.isTTY && Bun.which("glow")) {
    const proc = Bun.spawn(["glow"], { stdin: "pipe", stdout: "inherit", stderr: "inherit" });
    proc.stdin.write(md);
    proc.stdin.end();
    await proc.exited;
  } else {
    console.log(md);
  }
} else {
  console.error("Usage: gtasks list [tasklist-id]");
  process.exit(1);
}
