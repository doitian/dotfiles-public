#!/usr/bin/env bun
/**
 * Prompt Manager CLI - list and print prompts from multiple sources with variable substitution.
 * Port of default/bin/prompt-manager (Python) to JS.
 */
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { exists } from "./lib/fs.js";
import { home } from "./lib/env.js";

const BASE_DIR = join(home(), ".dotfiles", "repos", "public");
const SKILLS_DIR = join(BASE_DIR, "ai", "skills");
const SNIPPETS_FILE = join(BASE_DIR, "nvim", "snippets", "markdown.json");

/**
 * @returns {Promise<Record<string, { type: string; path: string }>>}
 */
async function discoverSkillsPrompts() {
  const prompts = {};
  if (!(await exists(SKILLS_DIR))) return prompts;
  try {
    const names = await readdir(SKILLS_DIR);
    for (const name of names) {
      const skillPath = join(SKILLS_DIR, name, "SKILL.md");
      if (await exists(skillPath)) {
        prompts[`skill/${name}`] = { type: "markdown", path: skillPath };
      }
    }
  } catch (_) {}
  return prompts;
}

/**
 * @returns {Promise<Record<string, { type: string; key: string; snippet: object }>>}
 */
async function discoverSnippetsPrompts() {
  const prompts = {};
  if (!(await exists(SNIPPETS_FILE))) return prompts;
  try {
    const raw = await readFile(SNIPPETS_FILE, "utf-8");
    const data = JSON.parse(raw);
    for (const [key, snippet] of Object.entries(data)) {
      if (!key.startsWith("Prompt ➤ ")) continue;
      const cleanKey = key.replace(/^Prompt ➤ /, "");
      prompts[`snippets/${cleanKey}`] = { type: "snippet", key, snippet };
    }
  } catch (e) {
    console.error(`Warning: Failed to parse snippets file: ${e.message}`);
  }
  return prompts;
}

/**
 * @returns {Promise<Record<string, { type: string; path?: string; key?: string; snippet?: object }>>}
 */
async function discoverPrompts() {
  const [skills, snippets] = await Promise.all([
    discoverSkillsPrompts(),
    discoverSnippetsPrompts(),
  ]);
  return { ...skills, ...snippets };
}

/**
 * @param {string} name
 * @param {ReturnType<typeof discoverPrompts>} registry
 * @returns {string | null}
 */
function loadPrompt(name, registry) {
  const info = registry[name];
  if (!info) return null;

  if (info.type === "markdown") {
    try {
      return readFileSync(info.path, "utf-8");
    } catch (e) {
      console.error(`Error reading file ${info.path}: ${e.message}`);
      return null;
    }
  }

  if (info.type === "snippet") {
    const body = info.snippet?.body;
    if (Array.isArray(body)) return body.join("\n");
    return body != null ? String(body) : "";
  }

  return null;
}

/**
 * Parse VSCode snippet variables. Returns list of [fullMatch, varType, defaultVal, choices].
 * @param {string} content
 * @returns {Array<[string, string, string | null, string[] | null]>}
 */
function parseSnippetVariables(content) {
  const variables = [];
  const choiceRe = /\$\{(\d+)\|([^}]+)\}/g;
  let m;
  while ((m = choiceRe.exec(content)) !== null) {
    const choices = m[2].split(",").map((c) => c.trim());
    variables.push([m[0], "choice", null, choices]);
  }
  const defaultRe = /\$\{(\d+):([^}]*)\}/g;
  while ((m = defaultRe.exec(content)) !== null) {
    variables.push([m[0], "default", m[2], null]);
  }
  const capturedTabstops = new Set();
  for (const [fullMatch, varType] of variables) {
    if (varType === "choice" || varType === "default") {
      const numMatch = fullMatch.match(/\$\{(\d+)/);
      if (numMatch) capturedTabstops.add(numMatch[1]);
    }
  }
  const tabstopRe = /\$(\d+)/g;
  while ((m = tabstopRe.exec(content)) !== null) {
    const fullVar = `$${m[1]}`;
    if (capturedTabstops.has(m[1])) continue;
    if (variables.some((v) => v[0] === fullVar)) continue;
    variables.push([fullVar, "tabstop", null, null]);
  }
  const namedRe = /\$([A-Z_][A-Z0-9_]*)/g;
  while ((m = namedRe.exec(content)) !== null) {
    variables.push([`$${m[1]}`, "named", null, null]);
  }
  return variables;
}

/** @param {string} varName */
function getKnownVariableValue(varName) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const known = {
    CURRENT_YEAR: String(now.getFullYear()),
    CURRENT_MONTH: pad(now.getMonth() + 1),
    CURRENT_DATE: pad(now.getDate()),
    CURRENT_HOUR: pad(now.getHours()),
    CURRENT_MINUTE: pad(now.getMinutes()),
  };
  return known[varName] ?? null;
}

/**
 * @param {string} content
 * @param {Record<string, string>} varsDict
 * @param {boolean} interactive
 * @param {(question: string) => Promise<string>} ask
 * @returns {Promise<string>}
 */
async function substituteVariables(content, varsDict, interactive, ask) {
  content = content.replace(/\$TM_SELECTED_TEXT/g, "__INPUT__");
  if (varsDict["__INPUT__"] !== undefined) {
    content = content.replace(/__INPUT__/g, varsDict["__INPUT__"]);
  }

  const variables = parseSnippetVariables(content);
  const typePriority = { choice: 0, default: 1, tabstop: 2, named: 3 };
  variables.sort(
    (a, b) => (typePriority[a[1]] ?? 99) - (typePriority[b[1]] ?? 99),
  );

  for (const [fullMatch, varType, defaultVal, choices] of variables) {
    if (!content.includes(fullMatch)) continue;
    let value = null;

    if (
      varType === "tabstop" ||
      varType === "default" ||
      varType === "choice"
    ) {
      const numMatch = fullMatch.match(/\d+/);
      const num = numMatch ? numMatch[0] : null;
      if (num && varsDict[num] !== undefined) value = varsDict[num];
      else if (varsDict[fullMatch] !== undefined) value = varsDict[fullMatch];
    } else {
      const varName = fullMatch.slice(1);
      if (varsDict[varName] !== undefined) value = varsDict[varName];
      else if (varsDict[fullMatch] !== undefined) value = varsDict[fullMatch];
    }

    if (value == null && varType === "named") {
      value = getKnownVariableValue(fullMatch.slice(1));
    }
    if (value == null && defaultVal != null) value = defaultVal;

    if (value == null && choices != null) {
      if (interactive) {
        console.error(`Choose a value for ${fullMatch}:`);
        choices.forEach((c, i) => console.error(`  ${i + 1}. ${c}`));
        try {
          const answer = await ask("Enter choice number: ");
          const idx = parseInt(answer.trim(), 10) - 1;
          value =
            idx >= 0 && idx < choices.length
              ? choices[idx]
              : (choices[0] ?? "");
        } catch {
          value = choices[0] ?? "";
        }
      } else {
        value = choices[0] ?? "";
      }
    }

    if (value == null && interactive) {
      let promptText = `Enter value for ${fullMatch}`;
      if (defaultVal) promptText += ` (default: ${defaultVal})`;
      promptText += ": ";
      try {
        const answer = await ask(promptText);
        value = answer.trim() || defaultVal || "";
      } catch {
        value = defaultVal ?? "";
      }
    }
    if (value == null) value = "";

    content = content.split(fullMatch).join(value);
    if (varType === "choice" || varType === "default") {
      const numMatch = fullMatch.match(/\d+/);
      const num = numMatch ? numMatch[0] : null;
      if (num) {
        const simpleTabstop = `$${num}`;
        content = content.replace(new RegExp(`\\$${num}(?![|:}])`, "g"), value);
      }
    }
  }
  return content;
}

/** @param {ReturnType<typeof discoverPrompts>} registry */
function listPrompts(registry) {
  for (const name of Object.keys(registry).sort()) {
    console.log(name);
  }
}

/**
 * @param {string} name
 * @param {ReturnType<typeof discoverPrompts>} registry
 * @param {Record<string, string>} varsDict
 * @param {boolean} interactive
 * @param {(q: string) => Promise<string>} ask
 */
async function printPrompt(name, registry, varsDict, interactive, ask) {
  const content = loadPrompt(name, registry);
  if (content == null) {
    console.error(`Error: Prompt '${name}' not found.`);
    process.exit(1);
  }
  const substituted = await substituteVariables(
    content,
    varsDict,
    interactive,
    ask,
  );
  process.stdout.write(substituted);
}

/**
 * @param {ReturnType<typeof discoverPrompts>} registry
 * @param {Record<string, string>} varsDict
 * @param {boolean} interactive
 * @param {(q: string) => Promise<string>} ask
 */
async function choosePrompt(registry, varsDict, interactive, ask) {
  const names = Object.keys(registry).sort();
  if (names.length === 0) {
    console.error("No prompts found.");
    process.exit(1);
  }
  const promptList = names.join("\n");
  const proc = Bun.spawn(["fzf"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
  });
  proc.stdin.write(promptList);
  proc.stdin.end();
  const exit = await proc.exited;
  const out = await new Response(proc.stdout).text();
  const selected = out.trim();
  if (exit === 130) process.exit(130);
  if (exit === 1) process.exit(0);
  if (exit !== 0) process.exit(exit);
  if (selected)
    await printPrompt(selected, registry, varsDict, interactive, ask);
}

/**
 * @param {string[]} argv
 * @returns {{ command: string; name?: string; var: string[]; input?: string; noInteractive: boolean }}
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    command: "choose",
    var: [],
    input: undefined,
    noInteractive: false,
  };
  let i = 0;
  if (args[0] && !args[0].startsWith("-")) {
    result.command = args[0];
    i = 1;
  }
  while (i < args.length) {
    if (args[i] === "--var" && args[i + 1]) {
      result.var.push(args[i + 1]);
      i += 2;
    } else if (args[i] === "--input" && args[i + 1]) {
      result.input = args[i + 1];
      i += 2;
    } else if (args[i] === "--no-interactive") {
      result.noInteractive = true;
      i += 1;
    } else if (
      result.command === "print" &&
      args[i] &&
      !args[i].startsWith("-")
    ) {
      result.name = args[i];
      i += 1;
    } else {
      i += 1;
    }
  }
  return result;
}

/** @param {string[]} varList */
function parseVars(varList) {
  const out = {};
  for (const v of varList) {
    const eq = v.indexOf("=");
    if (eq !== -1) {
      out[v.slice(0, eq)] = v.slice(eq + 1);
    } else {
      out[v] = "";
    }
  }
  return out;
}

function createAsk() {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const ask = (question) =>
    new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  return { ask, close: () => rl.close() };
}

async function main() {
  const args = parseArgs(process.argv);
  const registry = await discoverPrompts();
  const varsDict = parseVars(args.var);
  if (args.input != null) varsDict["__INPUT__"] = args.input;
  const interactive = !args.noInteractive;
  const { ask, close } = createAsk();

  try {
    if (args.command === "list") {
      listPrompts(registry);
    } else if (args.command === "print") {
      if (!args.name) {
        console.error("Error: print requires a prompt name.");
        process.exit(1);
      }
      await printPrompt(args.name, registry, varsDict, interactive, ask);
    } else if (args.command === "choose") {
      try {
        await choosePrompt(registry, varsDict, interactive, ask);
      } catch (e) {
        if (e?.code === "ENOENT" || e?.errno === -2) {
          console.error(
            "Error: fzf not found. Please install fzf to use the choose command.",
          );
          process.exit(1);
        }
        throw e;
      }
    } else {
      console.error(`Unknown command: ${args.command}`);
      process.exit(1);
    }
  } finally {
    close();
  }
}

main();
