#!/usr/bin/env bun
/**
 * Pick a search engine with fzf and open a web search in the browser.
 */
import { $ } from "bun";
import { parseArgs as parseArgsUtil } from "node:util";
import { createInterface } from "node:readline";

const USAGE = `Usage: web-search [-s <engine>] [query...]

Pick a search engine with fzf and open a web search in the browser.

Options:
  -s <engine>   Start fzf with this query (auto-selects on single match)
  -h, --help    Show this help
`;

const ENGINES = [
  { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s" },
  { name: "Google", url: "https://www.google.com/search?q=%s" },
  { name: "Perplexity @ai", url: "https://www.perplexity.ai/search/new?q=%s" },
  { name: "Scoop", url: "https://scoop.sh/#/apps?q=%s" },
  { name: "Goodreads @gr", url: "https://www.goodreads.com/search?q=%s" },
  { name: "UnicodePlus", url: "https://unicodeplus.com/search?q=%s" },
];

function parseArgs() {
  const { values, positionals } = parseArgsUtil({
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      search: { type: "string", short: "s" },
    },
  });
  if (values.help) {
    console.log(USAGE.trim());
    process.exit(0);
  }
  return {
    engineQuery: values.search ?? "",
    query: positionals.join(" ").trim(),
  };
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function openUrl(url) {
  console.log(url);
  if (process.platform === "win32") {
    await $`rundll32 url.dll,FileProtocolHandler ${url}`.quiet();
  } else if (process.platform === "darwin") {
    await $`open ${url}`.quiet();
  } else {
    await $`xdg-open ${url}`.quiet();
  }
}

async function main() {
  const { engineQuery, query } = parseArgs();

  const input = ENGINES.map((e) => e.name).join("\n");
  const fzfArgs = ["fzf", "-0", "-1"];
  if (engineQuery) fzfArgs.push("-q", engineQuery);

  const fzf = Bun.spawn(fzfArgs, {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
  });
  fzf.stdin.write(input);
  fzf.stdin.end();
  const code = await fzf.exited;
  const out = fzf.stdout ? await new Response(fzf.stdout).text() : "";
  const selected = out.trim();
  if (code !== 0 || !selected) process.exit(code ?? 1);

  const engine = ENGINES.find((e) => e.name === selected);
  if (!engine) {
    console.error(`Unknown engine: ${selected}`);
    process.exit(1);
  }

  let searchQuery = query;
  if (!searchQuery) {
    searchQuery = (await ask("Query: ")).trim();
    if (!searchQuery) process.exit(0);
  }

  const url = engine.url.replace("%s", encodeURIComponent(searchQuery));
  await openUrl(url);
}

main();
