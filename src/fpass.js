#!/usr/bin/env bun
/**
 * gopass + fzf/rofi/fuzzel. Port of default/bin/fpass.
 */
import { $ } from "bun";

const args = process.argv.slice(2);
const isRofi = args[0] === "--rofi";
const isFuzzel = args[0] === "--fuzzel";
const isCpi = args[0] === "cpi";
const isShowCi = args[0] === "show" && args[1] === "-ci";
const rest = isRofi || isFuzzel ? args.slice(1) : args;

function copyFieldLoop(entry, fields) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let selected = 0;
    let done = false;
    let busy = false;

    const cleanup = () => {
      process.stdout.write("\x1b[?25h\n");
      stdin.setRawMode(false);
      stdin.pause();
    };

    const quit = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };

    const render = () => {
      const maxVisible = Math.max(1, (process.stdout.rows || 24) - 2);
      let start = selected - Math.floor(maxVisible / 2);
      if (start < 0) start = 0;
      if (start + maxVisible > fields.length)
        start = Math.max(0, fields.length - maxVisible);

      const out = ["\x1b[?25l\x1b[H\x1b[2J"];
      out.push(`${entry}  (j/k move · Enter copy · q quit)`);
      const visible = fields.slice(start, start + maxVisible);
      for (let i = 0; i < visible.length; i++) {
        const idx = start + i;
        out.push(
          idx === selected
            ? "\x1b[7m> " + visible[i].label + "\x1b[0m"
            : "  " + visible[i].label,
        );
      }
      out.push(`\x1b[2m${selected + 1}/${fields.length}\x1b[0m`);
      process.stdout.write(out.join("\n"));
    };

    const copy = async () => {
      const field = fields[selected];
      const args = field.key
        ? ["show", "-c", entry, field.key]
        : ["show", "-c", entry];
      busy = true;
      stdin.setRawMode(false);
      stdin.pause();
      const proc = Bun.spawn(["gopass", ...args], {
        stdin: "ignore",
        stdout: "ignore",
        stderr: "inherit",
      });
      await proc.exited;
      stdin.setRawMode(true);
      stdin.resume();
      busy = false;
      render();
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    stdin.on("data", (chunk) => {
      if (busy) return;
      for (const ch of chunk) {
        if (ch === "\x03" || ch === "q" || ch === "Q") {
          quit();
          return;
        }
        if (ch === "j") {
          selected = Math.min(fields.length - 1, selected + 1);
          render();
        } else if (ch === "k") {
          selected = Math.max(0, selected - 1);
          render();
        } else if (ch === "\r" || ch === "\n") {
          copy();
          return;
        }
      }
    });

    render();
  });
}

async function fzfSelect(list) {
  const fzfProc = Bun.spawn(["fzf"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
    env: process.env,
  });
  fzfProc.stdin.write(list);
  fzfProc.stdin.end();
  const code = await fzfProc.exited;
  const out = fzfProc.stdout ? await new Response(fzfProc.stdout).text() : "";
  return { code, selected: out.trim().split("\n")[0] };
}

async function interactiveCopy() {
  process.env.GPG_TTY =
    process.env.GPG_TTY || (process.platform !== "win32" ? "/dev/tty" : "");
  const listR = await $`gopass list -f`.quiet().nothrow();
  if (listR.exitCode !== 0) process.exit(listR.exitCode);
  const entries = (listR.stdout?.toString() ?? "")
    .trim()
    .split("\n")
    .filter(Boolean);
  if (entries.length === 0) process.exit(0);
  if (!process.stdin.isTTY) {
    console.error("cpi requires an interactive terminal");
    process.exit(1);
  }
  const { selected: entry } = await fzfSelect(entries.join("\n"));
  if (!entry) process.exit(0);

  const showR = await $`gopass show ${entry}`.quiet().nothrow();
  if (showR.exitCode !== 0) process.exit(showR.exitCode);
  const lines = (showR.stdout?.toString() ?? "").split("\n");
  const fields = [{ label: "password", key: null }];
  for (const line of lines.slice(1)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) fields.push({ label: match[1], key: match[1] });
  }
  await copyFieldLoop(entry, fields);
}

async function main() {
  if (isRofi) {
    if (rest.length === 0) {
      const r = await $`gopass list -f`.nothrow();
      process.exit(r.exitCode ?? 0);
    }
    const proc = Bun.spawn(["gopass", "show", "-c", ...rest], {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });
    proc.unref();
    return;
  }

  if (isFuzzel) {
    const listR = await $`gopass list -f`.quiet().nothrow();
    if (listR.exitCode !== 0) process.exit(listR.exitCode);
    const list = { stdout: (listR.stdout?.toString() ?? "").trim() };
    const fuzzelR = await $`fuzzel --dmenu -w 50 < ${new Response(list.stdout)}`
      .quiet()
      .nothrow();
    const fuzzel = {
      code: fuzzelR.exitCode,
      stdout: (fuzzelR.stdout?.toString() ?? "").trim(),
    };
    if (fuzzel.code !== 0 || !fuzzel.stdout) process.exit(fuzzel.code ?? 1);
    const r = await $`gopass show -c ${fuzzel.stdout}`.nothrow();
    process.exit(r.exitCode ?? 0);
  }

  if (isCpi || isShowCi) {
    await interactiveCopy();
    return;
  }

  process.env.GPG_TTY =
    process.env.GPG_TTY || (process.platform !== "win32" ? "/dev/tty" : "");
  const listR = await $`gopass list -f`.quiet().nothrow();
  if (listR.exitCode !== 0) process.exit(listR.exitCode);
  const list = { stdout: (listR.stdout?.toString() ?? "").trim() };
  const { code: fzfCode, selected: fzfSelected } = await fzfSelect(list.stdout);
  if (fzfCode !== 0 || !fzfSelected) process.exit(fzfCode ?? 1);
  const entry = fzfSelected;
  const gopassArgs = [...rest, entry].filter(Boolean);
  const r = await $`gopass ${gopassArgs}`.nothrow();
  process.exit(r.exitCode ?? 0);
}

main();
