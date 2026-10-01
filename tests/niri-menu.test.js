import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../src/niri-scripts/niri-menu.js", import.meta.url));
const linuxTest = test.skipIf(process.platform !== "linux");

async function fixture(state, unloaded = false) {
  const dir = await mkdtemp(join(tmpdir(), "niri-menu "));
  const bin = join(dir, "bin");
  const runtime = join(dir, "runtime");
  await mkdir(bin);
  await mkdir(join(runtime, "hyprwhspr"), { recursive: true });
  if (unloaded) await writeFile(join(runtime, "hyprwhspr", "model_unloaded"), "");
  await writeFile(join(bin, "systemctl"), `#!/bin/sh
if [ "$*" = "--user show hyprwhspr.service --property=ActiveState --value" ]; then
  printf '%s\\n' "$TEST_STATE"
  exit "$TEST_STATUS_EXIT"
fi
printf 'systemctl %s\\n' "$*" >> "$TEST_LOG"
printf '%s' "$TEST_ERROR" >&2
exit "$TEST_ACTION_EXIT"
`, { mode: 0o755 });
  await writeFile(join(bin, "hyprwhspr"), `#!/bin/sh
printf 'hyprwhspr %s\\n' "$*" >> "$TEST_LOG"
printf '%s' "$TEST_ERROR" >&2
exit "$TEST_ACTION_EXIT"
`, { mode: 0o755 });
  await writeFile(join(bin, "fc-match"), `#!/bin/sh
printf '%s' "$TEST_FONT_FAMILY"
exit "$TEST_FONT_EXIT"
`, { mode: 0o755 });
  const env = {
    ...process.env,
    HOME: dir,
    PATH: bin,
    XDG_RUNTIME_DIR: runtime,
    ROFI_DATA: JSON.stringify(["Hyprwhspr"]),
    ROFI_RETV: "0",
    TEST_STATE: state,
    TEST_LOG: join(dir, "actions"),
    TEST_STATUS_EXIT: "0",
    TEST_ACTION_EXIT: "0",
    TEST_ERROR: "",
    TEST_FONT_FAMILY: "MesloLGS Nerd Font Mono",
    TEST_FONT_EXIT: "0",
  };
  return { dir, env };
}

async function audioFixture() {
  const { dir, env } = await fixture("inactive");
  await writeFile(join(dir, "bin", "pactl"), `#!/bin/sh
if [ "$1" = "--format=json" ]; then
  printf '%s' "$TEST_ERROR" >&2
  case "$2 $3" in
    "info ") printf '%s' "$TEST_AUDIO_INFO" ;;
    "list sinks") printf '%s' "$TEST_SINKS" ;;
    "list sources") printf '%s' "$TEST_SOURCES" ;;
  esac
  exit "$TEST_STATUS_EXIT"
fi
printf '%s\\n' "$@" >> "$TEST_LOG"
printf '%s' "$TEST_ERROR" >&2
exit "$TEST_ACTION_EXIT"
`, { mode: 0o755 });
  return {
    dir,
    env: {
      ...env,
      ROFI_DATA: JSON.stringify(["Audio"]),
      TEST_AUDIO_INFO: JSON.stringify({ default_sink_name: "speakers", default_source_name: "mic" }),
      TEST_SINKS: JSON.stringify([
        { name: "speakers", description: "Speakers" },
        { name: "headphones", description: "Headphones" },
      ]),
      TEST_SOURCES: JSON.stringify([
        { name: "mic", description: "Microphone" },
        { name: "webcam", description: "Webcam" },
      ]),
    },
  };
}

async function run(env, selection) {
  const child = Bun.spawn([process.execPath, script, ...(selection ? [selection] : [])], {
    env: { ...env, ROFI_RETV: selection ? "1" : "0", ...(selection ? { ROFI_INFO: selection } : {}) },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  const rows = stdout.split("\n").filter((line) => line && !line.startsWith("\0")).map((line) => {
    const [text, options = ""] = line.split("\0");
    const [, info, , display] = options.split("\x1f");
    return { text, info, display };
  });
  return { code, stdout, stderr, rows, labels: rows.map((row) => row.info) };
}

linuxTest("menu launcher reserves row height for the larger icon font", async () => {
  const { dir, env } = await fixture("inactive");
  try {
    await writeFile(join(dir, "bin", "rofi"), '#!/bin/sh\nprintf "%s\\n" "$@" > "$TEST_LOG"\n', { mode: 0o755 });
    const child = Bun.spawn([process.execPath, script], {
      env: { ...env, ROFI_RETV: undefined, ROFI_DATA: undefined },
      stdout: "ignore",
      stderr: "pipe",
    });
    expect(await child.exited).toBe(0);
    const args = (await Bun.file(env.TEST_LOG).text()).trimEnd().split("\n");
    expect(args[args.indexOf("-theme-str") + 1]).toBe('element-text { font: "Sarasa UI SC 18"; }');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("menu glyphs use monospaced text and inherit theme colors", async () => {
  const { dir, env } = await fixture("inactive");
  try {
    const menu = await run({ ...env, ROFI_DATA: "[]" });
    expect(menu).toMatchObject({ code: 0, labels: ["Niri", "Audio", "Hyprwhspr", "Waybar"] });
    for (const { text: plain, display } of menu.rows) {
      expect(display).toMatch(/^<span font_family="MesloLGS Nerd Font Mono" rise="-3pt">[\uE000-\uF8FF]<\/span>  /u);
      expect(display.endsWith(`<span size="12pt">${plain}</span>`)).toBe(true);
      expect(display).not.toMatch(/foreground|background|color/);
    }
    expect(menu.stdout).toContain("\0markup-rows\x1ftrue\n");
    expect(menu.stdout).not.toContain("\0icon\x1f");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("missing icon font gives text-only root and submenus without warnings", async () => {
  const { dir, env } = await fixture("inactive");
  try {
    env.TEST_FONT_FAMILY = "DejaVu Sans";
    const rootEnv = { ...env, ROFI_DATA: "[]" };
    const menu = await run(rootEnv);
    expect(menu).toMatchObject({ code: 0, labels: ["Niri", "Audio", "Hyprwhspr", "Waybar"] });
    expect(menu.stdout).toContain('Niri\0info\x1fNiri\x1fdisplay\x1f<span size="12pt">Niri</span>\n');
    expect(menu.stdout).not.toMatch(/[\uE000-\uF8FF]|Warning:/u);
    const child = await run(rootEnv, "Niri");
    expect(child).toMatchObject({ code: 0, labels: ["Exit", "Reboot", "Shutdown", "Sleep", "Shortcuts"] });
    expect(child.stdout).not.toMatch(/[\uE000-\uF8FF]|Warning:/u);
    expect(await run(env, "Start service")).toMatchObject({ code: 0, stdout: "" });
    expect(await Bun.file(env.TEST_LOG).text()).toBe("systemctl --user start hyprwhspr.service\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("font checks accept family aliases and silently handle unavailable fontconfig", async () => {
  const { dir, env } = await fixture("inactive");
  try {
    env.ROFI_DATA = "[]";
    const installed = await run({ ...env, TEST_FONT_FAMILY: "MesloLGS Nerd Font Mono, MesloLGS Nerd Font Mono Regular" });
    expect(installed).toMatchObject({ code: 0, labels: ["Niri", "Audio", "Hyprwhspr", "Waybar"] });
    expect(installed.stdout).toContain('font_family="MesloLGS Nerd Font Mono"');
    const failed = await run({ ...env, TEST_FONT_EXIT: "1" });
    expect(failed).toMatchObject({ code: 0, labels: installed.labels });
    expect(failed.stdout).not.toMatch(/[\uE000-\uF8FF]|Warning:/u);
    await rm(join(dir, "bin", "fc-match"));
    const missing = await run(env);
    expect(missing).toMatchObject({ code: 0, labels: installed.labels });
    expect(missing.stdout).not.toMatch(/[\uE000-\uF8FF]|Warning:/u);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

for (const [selection, command] of [
  ["Reboot", "systemctl reboot"],
  ["Shutdown", "systemctl poweroff"],
  ["Sleep", "systemctl suspend"],
]) {
  linuxTest(`niri power action: ${selection}`, async () => {
    const { dir, env } = await fixture("inactive");
    try {
      env.ROFI_DATA = JSON.stringify(["Niri"]);
      expect(await run(env, selection)).toMatchObject({ code: 0, stdout: "" });
      expect(await Bun.file(env.TEST_LOG).text()).toBe(`${command}\n`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

for (const [state, unloaded, labels] of [
  ["active", false, ["Stop service", "Restart service", "Unload model"]],
  ["active", true, ["Stop service", "Restart service", "Reload model"]],
  ["inactive", false, ["Start service"]],
  ["inactive", true, ["Start service"]],
  ["failed", true, ["Start service"]],
  ["activating", false, ["Stop service", "Restart service"]],
  ["reloading", false, ["Stop service", "Restart service"]],
  ["deactivating", true, []],
]) {
  linuxTest(`hyprwhspr menu: ${state}, unloaded=${unloaded}`, async () => {
    const { dir, env } = await fixture(state, unloaded);
    try {
      expect(await run(env)).toMatchObject({ code: 0, labels });
      expect(await Bun.file(env.TEST_LOG).exists()).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

for (const [state, unloaded, selection, command] of [
  ["inactive", false, "Start service", "systemctl --user start hyprwhspr.service"],
  ["active", false, "Stop service", "systemctl --user stop hyprwhspr.service"],
  ["active", false, "Restart service", "systemctl --user restart hyprwhspr.service"],
  ["active", false, "Unload model", "hyprwhspr model unload"],
  ["active", true, "Reload model", "hyprwhspr model reload"],
]) {
  linuxTest(`hyprwhspr action: ${selection}`, async () => {
    const { dir, env } = await fixture(state, unloaded);
    try {
      expect(await run(env, selection)).toMatchObject({ code: 0, stdout: "" });
      expect(await Bun.file(env.TEST_LOG).text()).toBe(`${command}\n`);
      expect(await run({ ...env, TEST_ACTION_EXIT: "1", TEST_ERROR: "test failure" }, selection))
        .toMatchObject({ code: 1, stdout: "", stderr: expect.stringContaining("test failure") });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

linuxTest("hyprwhspr rechecks state before acting on a stale selection", async () => {
  const { dir, env } = await fixture("active", true);
  try {
    expect(await run(env, "Unload model")).toMatchObject({ code: 0, stdout: "" });
    expect(await run({ ...env, TEST_STATE: "inactive" }, "Reload model"))
      .toMatchObject({ code: 0, stdout: "" });
    expect(await Bun.file(env.TEST_LOG).exists()).toBe(false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("audio is a top-level menu with inputs, outputs, and marked defaults", async () => {
  const { dir, env } = await audioFixture();
  try {
    const root = await run({ ...env, ROFI_DATA: "[]" });
    expect(root.labels.slice(0, 2)).toEqual(["Niri", "Audio"]);
    const menu = await run({ ...env, ROFI_DATA: "[]" }, "Audio");
    expect(menu).toMatchObject({
      code: 0,
      labels: ["Output: Speakers ✓", "Output: Headphones", "Input: Microphone ✓", "Input: Webcam"],
    });
    expect(menu.stdout).toContain('Output: Speakers ✓\0info\x1fOutput: Speakers ✓\x1fdisplay\x1f<span font_family="MesloLGS Nerd Font Mono" rise="-3pt">\u{F028}</span>  <span size="12pt">Output: Speakers ✓</span>');
    expect(menu.stdout).toContain('Input: Microphone ✓\0info\x1fInput: Microphone ✓\x1fdisplay\x1f<span font_family="MesloLGS Nerd Font Mono" rise="-3pt">\u{F130}</span>  <span size="12pt">Input: Microphone ✓</span>');
    expect(await Bun.file(env.TEST_LOG).exists()).toBe(false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

for (const [selection, kind, name] of [
  ["Output: Speakers ✓", "sink", "speakers"],
  ["Output: Headphones", "sink", "headphones"],
  ["Input: Microphone ✓", "source", "mic"],
  ["Input: Webcam", "source", "webcam"],
]) {
  linuxTest(`audio sets default: ${selection}`, async () => {
    const { dir, env } = await audioFixture();
    try {
      expect(await run(env, selection)).toMatchObject({ code: 0, stdout: "" });
      expect(await Bun.file(env.TEST_LOG).text()).toBe(`set-default-${kind}\n${name}\n`);
      expect(await run({ ...env, TEST_ACTION_EXIT: "1", TEST_ERROR: "access denied" }, selection))
        .toMatchObject({ code: 1, stderr: expect.stringContaining("access denied") });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

linuxTest("audio distinguishes duplicate descriptions and safely passes device names", async () => {
  const { dir, env } = await audioFixture();
  const name = "usb mic; $(touch nope)";
  try {
    env.TEST_SOURCES = JSON.stringify([
      { name: "mic", description: "Microphone" },
      { name, description: "Microphone" },
    ]);
    const selection = `Input: Microphone (${name})`;
    expect((await run(env)).labels).toContain("Input: Microphone (mic) ✓");
    expect((await run(env)).labels).toContain(selection);
    expect(await run(env, selection)).toMatchObject({ code: 0, stdout: "" });
    expect(await Bun.file(env.TEST_LOG).text()).toBe(`set-default-source\n${name}\n`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("menu escapes row markup without changing audio selections", async () => {
  const { dir, env } = await audioFixture();
  try {
    env.TEST_SINKS = JSON.stringify([{ name: "dac", description: "<b>DAC</b> & Amp" }]);
    const selection = "Output: <b>DAC</b> & Amp";
    const menu = await run(env);
    const escaped = "Output: &lt;b&gt;DAC&lt;/b&gt; &amp; Amp";
    expect(menu.rows).toContainEqual({ text: escaped, info: selection, display: expect.stringMatching(new RegExp(`<span size="12pt">${escaped}</span>$`)) });
    expect(await run(env, selection)).toMatchObject({ code: 0, stdout: "" });
    expect(await Bun.file(env.TEST_LOG).text()).toBe("set-default-sink\ndac\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("menu escapes iconless shortcut labels", async () => {
  const { dir, env } = await fixture("inactive");
  try {
    await mkdir(join(dir, ".config", "niri"), { recursive: true });
    await writeFile(join(dir, ".config", "niri", "config.kdl"), `binds {
    Mod+N hotkey-overlay-title="Read <notes> & docs" { spawn "notes"; }
}`);
    const menu = await run({ ...env, ROFI_DATA: JSON.stringify(["Niri", "Shortcuts"]) });
    const label = `${"Mod+N".padEnd(22)} Read <notes> & docs`;
    expect(menu).toMatchObject({ code: 0, labels: [label] });
    // rofi drops rows whose text fails to parse as markup from filtered results
    const escaped = `${"Mod+N".padEnd(22)} Read &lt;notes&gt; &amp; docs`;
    expect(menu.rows).toEqual([{ text: escaped, info: label, display: `<span size="12pt">${escaped}</span>` }]);
    expect(menu.stdout).not.toContain("MesloLGS");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("audio handles empty device lists and reports server failures", async () => {
  const { dir, env } = await audioFixture();
  try {
    expect(await run({ ...env, TEST_SINKS: "[]", TEST_SOURCES: "[]" }))
      .toMatchObject({ code: 0, labels: [] });
    expect(await run({ ...env, TEST_STATUS_EXIT: "1", TEST_ERROR: "connection refused" }))
      .toMatchObject({ code: 1, labels: [], stderr: expect.stringContaining("connection refused") });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("hyprwhspr status failure does not offer a start action", async () => {
  const { dir, env } = await fixture("inactive");
  try {
    expect(await run({ ...env, TEST_STATUS_EXIT: "1" }))
      .toMatchObject({ code: 1, labels: [], stderr: expect.stringContaining("cannot read hyprwhspr service status") });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
