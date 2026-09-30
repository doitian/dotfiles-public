import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../src/niri-scripts/niri-clipboard.js", import.meta.url));
const linuxTest = test.skipIf(process.platform !== "linux");

const list = [
  "42\t[[ binary data 6 B png 2x2 ]]",
  "41\thello world",
  '40\t<meta http-equiv="content-type" content="text/html" />',
  "39\t[[ binary data 9 B gif 1x1 ]]",
].join("\n") + "\n";

const markers = "\0prompt\x1fClipboard\n\0no-custom\x1ftrue\n\0use-hot-keys\x1ftrue\n"
  + "\0message\x1fEnter: copy · Ctrl+Enter: paste · Ctrl+Shift+Enter: paste plain\n";

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "niri-clipboard "));
  const bin = join(dir, "bin");
  const tmp = join(dir, "tmp");
  const runtime = join(dir, "runtime");
  await mkdir(bin);
  await mkdir(tmp);
  await mkdir(runtime);
  await writeFile(join(dir, "list"), list);
  await writeFile(join(bin, "cliphist"), `#!/bin/sh
case "$1" in
  list)
    if [ -n "$TEST_LIST_ERROR" ]; then
      printf '%s' "$TEST_LIST_ERROR" >&2
      exit 1
    fi
    /bin/cat "$TEST_LIST"
    ;;
  decode)
    case "$2" in
      42) printf 'PNGDATA' ;;
      41) printf 'hello world' ;;
      43) printf '<p>Hello <b>world</b>&amp; bye</p>' ;;
      *)
        printf 'id %s not found' "$2" >&2
        exit 1
        ;;
    esac
    ;;
esac
`, { mode: 0o755 });
  await writeFile(join(bin, "wl-copy"), `#!/bin/sh
for arg in "$@"; do printf '%s\\n' "$arg"; done >> "$TEST_COPY_ARGS"
/bin/cat > "$TEST_COPY_LOG"
# hold inherited stdout/stderr open like wl-copy's background server
/bin/sleep 6 &
`, { mode: 0o755 });
  await writeFile(join(bin, "rofi"), `#!/bin/sh
printf '%s\\n' "$@" >> "$TEST_ROFI_LOG"
if [ -n "$TEST_ROFI_PENDING" ]; then
  printf '%s' "$TEST_ROFI_PENDING" > "$NIRI_CLIPBOARD_PENDING"
fi
`, { mode: 0o755 });
  await writeFile(join(bin, "niri"), `#!/bin/sh
if [ "$*" = "msg --json focused-window" ]; then
  printf '%s' "$TEST_FOCUSED_WINDOW"
fi
`, { mode: 0o755 });
  await writeFile(join(bin, "ydotool"), `#!/bin/sh
shift
printf '%s\\n' "$@" >> "$TEST_PASTE_LOG"
`, { mode: 0o755 });
  return {
    dir,
    tmp,
    runtime,
    env: {
      ...process.env,
      PATH: bin,
      TMPDIR: tmp,
      XDG_RUNTIME_DIR: runtime,
      ROFI_RETV: "0",
      NIRI_CLIPBOARD_PENDING: join(dir, "pending.json"),
      TEST_LIST: join(dir, "list"),
      TEST_LIST_ERROR: "",
      TEST_COPY_LOG: join(dir, "copied"),
      TEST_COPY_ARGS: join(dir, "copy-args"),
      TEST_ROFI_LOG: join(dir, "rofi"),
      TEST_ROFI_PENDING: "",
      TEST_PASTE_LOG: join(dir, "pasted"),
      TEST_FOCUSED_WINDOW: JSON.stringify({ app_id: "firefox", title: "tab" }),
    },
  };
}

async function run(env, args = []) {
  const child = Bun.spawn([process.execPath, script, ...args], {
    env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  const rows = stdout.split("\n").filter((line) => line && !line.startsWith("\0"));
  return { code, stdout, stderr, rows };
}

linuxTest("lists text rows, thumbnails images, and hides HTML blobs", async () => {
  const { dir, tmp, env } = await fixture();
  try {
    const { code, stdout, rows } = await run(env);
    expect(code).toBe(0);
    expect(rows).toEqual([
      `42\t[[ binary data 6 B png 2x2 ]]\0icon\x1f${join(tmp, "cliphist", "42.png")}`,
      "41\thello world",
      "39\t[[ binary data 9 B gif 1x1 ]]",
    ]);
    expect(stdout).not.toContain("meta http-equiv");
    expect(await Bun.file(join(tmp, "cliphist", "42.png")).text()).toBe("PNGDATA");
    expect(await Bun.file(join(tmp, "cliphist", "39.gif")).exists()).toBe(false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("copies the selected row while wl-copy keeps serving", async () => {
  const { dir, env } = await fixture();
  try {
    // Fails if the picker waits on wl-copy's background server (rofi would hang)
    let timer;
    const result = await Promise.race([
      run({ ...env, ROFI_RETV: "1" }, ["42\t[[ binary data 6 B png 2x2 ]]"]),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ timeout: true }), 3_000);
      }),
    ]);
    clearTimeout(timer);
    expect(result.timeout).toBeUndefined();
    expect(result.code).toBe(0);
    expect(await Bun.file(env.TEST_COPY_LOG).text()).toBe("PNGDATA");
    expect(await Bun.file(env.TEST_COPY_ARGS).text()).toBe("");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("paste shortcut queues a paste action", async () => {
  const { dir, env } = await fixture();
  try {
    const { code, stdout } = await run({ ...env, ROFI_RETV: "12" }, ["42\t[[ binary data 6 B png 2x2 ]]"]);
    expect(code).toBe(0);
    expect(stdout).toBe("");
    expect(await Bun.file(env.NIRI_CLIPBOARD_PENDING).json()).toEqual({ action: "paste", id: "42" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("plain shortcut queues a plain action", async () => {
  const { dir, env } = await fixture();
  try {
    const { code, stdout } = await run({ ...env, ROFI_RETV: "13" }, ["41\thello world"]);
    expect(code).toBe(0);
    expect(stdout).toBe("");
    expect(await Bun.file(env.NIRI_CLIPBOARD_PENDING).json()).toEqual({ action: "plain", id: "41" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("plain shortcut refuses image rows", async () => {
  const { dir, env } = await fixture();
  try {
    const { code, stderr } = await run({ ...env, ROFI_RETV: "13" }, ["42\t[[ binary data 6 B png 2x2 ]]"]);
    expect(code).toBe(1);
    expect(stderr).toContain("paste as plain text works only for text entries");
    expect(await Bun.file(env.NIRI_CLIPBOARD_PENDING).exists()).toBe(false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("shows an empty picker when nothing is stored", async () => {
  const { dir, env } = await fixture();
  try {
    const { code, stdout, rows } = await run({ ...env, TEST_LIST_ERROR: "please store something first" });
    expect(code).toBe(0);
    expect(rows).toEqual([]);
    expect(stdout).toBe(markers);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("reports cliphist list failures", async () => {
  const { dir, env } = await fixture();
  try {
    const { code, stderr } = await run({ ...env, TEST_LIST_ERROR: "opening db: permission denied" });
    expect(code).toBe(1);
    expect(stderr).toContain("cliphist list failed: opening db: permission denied");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("rejects a selection without an id", async () => {
  const { dir, env } = await fixture();
  try {
    const { code, stderr } = await run({ ...env, ROFI_RETV: "1" }, ["garbage"]);
    expect(code).toBe(1);
    expect(stderr).toContain("invalid selection: garbage");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("launcher opens rofi in the clipboard mode", async () => {
  const { dir, env } = await fixture();
  try {
    delete env.ROFI_RETV;
    const { code } = await run(env);
    expect(code).toBe(0);
    expect(await Bun.file(env.TEST_ROFI_LOG).text()).toBe(
      "-show\nclipboard\n-modes\nclipboard:niri-clipboard\n-show-icons\n-theme\nclipboard\n"
      + "-kb-accept-custom\nControl+Alt+Return\n-kb-accept-custom-alt\nControl+Alt+Shift+Return\n"
      + "-kb-custom-2\nControl+Return\n-kb-custom-3\nControl+Shift+Return\n",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("launcher pastes the queued entry", async () => {
  const { dir, runtime, env } = await fixture();
  try {
    delete env.ROFI_RETV;
    env.TEST_ROFI_PENDING = JSON.stringify({ action: "paste", id: "42" });
    const { code } = await run(env);
    expect(code).toBe(0);
    expect(await Bun.file(env.TEST_COPY_LOG).text()).toBe("PNGDATA");
    expect(await Bun.file(env.TEST_COPY_ARGS).text()).toBe("");
    expect(await Bun.file(env.TEST_PASTE_LOG).text()).toBe("29:1\n47:1\n47:0\n29:0\n");
    expect(await readdir(runtime)).toEqual([]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("launcher pastes plain text and uses Ctrl+Shift+V in terminals", async () => {
  const { dir, env } = await fixture();
  try {
    delete env.ROFI_RETV;
    env.TEST_ROFI_PENDING = JSON.stringify({ action: "plain", id: "43" });
    env.TEST_FOCUSED_WINDOW = JSON.stringify({ app_id: "kitty", title: "zsh" });
    const { code } = await run(env);
    expect(code).toBe(0);
    expect(await Bun.file(env.TEST_COPY_LOG).text()).toBe("Hello world& bye");
    expect(await Bun.file(env.TEST_COPY_ARGS).text()).toBe("--type\ntext/plain\n");
    expect(await Bun.file(env.TEST_PASTE_LOG).text()).toBe("29:1\n42:1\n47:1\n47:0\n42:0\n29:0\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("launcher reports a missing cliphist", async () => {
  const { dir, env } = await fixture();
  try {
    delete env.ROFI_RETV;
    await rm(join(dir, "bin", "cliphist"));
    const { code, stderr } = await run(env);
    expect(code).toBe(1);
    expect(stderr).toContain("cliphist not found");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});