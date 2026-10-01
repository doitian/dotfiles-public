import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../src/niri-scripts/niri-screenshot.js", import.meta.url));
const linuxTest = test.skipIf(process.platform !== "linux");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64",
);

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "niri-screenshot-"));
  const bin = join(dir, "bin");
  const runtime = join(dir, "runtime");
  const home = join(dir, "home");
  await mkdir(bin);
  await mkdir(runtime);
  await mkdir(join(home, "Pictures", "Screenshots"), { recursive: true });
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    HOME: home,
    XDG_RUNTIME_DIR: runtime,
    TEST_NIRI_LOG: join(dir, "niri-log"),
    TEST_CAPTURED: join(dir, "captured"),
    TEST_NEW_ENTRY: join(dir, "new-entry"),
    TEST_SATTY_ARGS: join(dir, "satty-args"),
    TEST_SATTY_RUNS: join(dir, "satty-runs"),
    TEST_COPY_CMD: join(dir, "copy-cmd"),
    TEST_COPY_EXIT: join(dir, "copy-exit"),
    TEST_PNG: join(dir, "fixture.png"),
    TEST_DELETE: join(dir, "deleted"),
    TEST_COPY_ARGS: join(dir, "copy-args"),
    TEST_COPY_LOG: join(dir, "copy-log"),
  };
  await writeFile(env.TEST_NIRI_LOG, "");
  await writeFile(env.TEST_PNG, png);
  await writeFile(join(bin, "niri"), `#!/usr/bin/env bun
import { appendFileSync, writeSync } from "node:fs";
const args = process.argv.slice(2);
const log = process.env.TEST_NIRI_LOG;
appendFileSync(log, args.join(" ") + "\\n");
if (args[0] === "msg" && args[1] === "-j" && args[2] === "event-stream") {
  appendFileSync(log, "entered stream\\n");
  writeSync(1, JSON.stringify({ ConfigLoaded: { failed: false } }) + "\\n");
  appendFileSync(log, "after first line\\n");
  const captured = process.env.TEST_CAPTURED;
  for (let i = 0; i < 200; i++) {
    try {
      if (await Bun.file(captured).exists()) break;
    } catch (err) {
      appendFileSync(log, "exists err " + err.message + "\\n");
    }
    await Bun.sleep(25);
  }
  appendFileSync(log, "emit " + (await Bun.file(captured).exists()) + "\\n");
  if (await Bun.file(captured).exists()) writeSync(1, (await Bun.file(captured).text()).trimEnd() + "\\n");
  await Bun.sleep(30_000);
  process.exit(0);
}
if (args[0] === "msg" && args[1] === "action") {
  const path = args[args.indexOf("--path") + 1];
  await Bun.write(log, (await Bun.file(log).text()) + "captured-env=" + process.env.TEST_CAPTURED + " path=" + path + "\\n");
  if (path && !process.env.TEST_CANCEL) {
    await Bun.write(path, Bun.file(process.env.TEST_PNG));
    await Bun.write(process.env.TEST_CAPTURED, JSON.stringify({ ScreenshotCaptured: { path } }) + "\\n");
    await Bun.write(process.env.TEST_NEW_ENTRY, "99\\t[[ binary data 4 B png 1x1 ]]\\n");
  }
}
`, { mode: 0o755 });
  await writeFile(join(bin, "satty"), [
    "#!/usr/bin/env bun",
    "import { appendFileSync } from 'node:fs';",
    "const args = process.argv.slice(2);",
    "await Bun.write(process.env.TEST_SATTY_ARGS, args.join('\\n') + '\\n');",
    "appendFileSync(process.env.TEST_SATTY_RUNS, args.join(' ') + '\\n');",
    "const cmd = args[args.indexOf('--copy-command') + 1] ?? '';",
    "await Bun.write(process.env.TEST_COPY_CMD, cmd);",
    "const image = args[args.indexOf('--filename') + 1];",
    "// Like satty: write the PNG, then wait for the command without closing its stdin.",
    "const copy = Bun.spawn(['sh', '-c', cmd], { stdin: 'pipe', stdout: 'ignore', stderr: 'ignore' });",
    "copy.stdin.write(await Bun.file(image).bytes());",
    "await copy.stdin.flush();",
    "await Bun.write(process.env.TEST_COPY_EXIT, String(await copy.exited));",
    "",
  ].join("\n"), { mode: 0o755 });
  await writeFile(join(bin, "cliphist"), `#!/usr/bin/env bun
const [cmd] = process.argv.slice(2);
if (cmd === "list") {
  const extra = Bun.file(process.env.TEST_NEW_ENTRY);
  if (await extra.exists()) process.stdout.write(await extra.text());
  console.log("1\\told text");
} else if (cmd === "delete") {
  await Bun.write(process.env.TEST_DELETE, await Bun.stdin.text());
}
`, { mode: 0o755 });
  await writeFile(join(bin, "wl-copy"), `#!/usr/bin/env bun
await Bun.write(process.env.TEST_COPY_ARGS, process.argv.slice(2).join("\\n") + "\\n");
await Bun.write(process.env.TEST_COPY_LOG, new Uint8Array(await Bun.stdin.arrayBuffer()));
`, { mode: 0o755 });
  return { dir, runtime, home, env };
}

linuxTest("annotate capture drops niri's cliphist entry when satty copies", async () => {
  const { dir, env } = await fixture();
  const proc = Bun.spawn([process.execPath, script, "screenshot", "--annotate"], {
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await Promise.race([proc.exited, Bun.sleep(4_000).then(() => "timeout")]);
  if (code !== 0) proc.kill();
  const stderr = await new Response(proc.stderr).text();
  const niriLog = await readFile(env.TEST_NIRI_LOG, "utf8").catch((err) => err.message);
  try {
    expect(code, `${stderr}\n--- niri ---\n${niriLog}`).toBe(0);
    expect(niriLog).toContain("msg action screenshot --path ");
    expect(niriLog).not.toContain("--write-to-disk");
    const sattyArgs = await readFile(env.TEST_SATTY_ARGS, "utf8");
    expect(sattyArgs).toContain("--fullscreen");
    expect(sattyArgs).not.toContain("--output-filename");
    const copyCmd = await readFile(env.TEST_COPY_CMD, "utf8");
    expect(copyCmd).toContain("--copy-png");
    expect(await readFile(env.TEST_COPY_EXIT, "utf8"), copyCmd).toBe("0");
    expect(Buffer.compare(await readFile(env.TEST_COPY_LOG), png)).toBe(0);
    expect(await readFile(env.TEST_DELETE, "utf8")).toBe("99\n");
  } finally {
    proc.kill();
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("an instance superseded by a newer screenshot leaves satty to it", async () => {
  const { dir, env } = await fixture();
  const run = (extra = {}) =>
    Bun.spawn([process.execPath, script, "screenshot", "--annotate"], {
      env: { ...env, ...extra },
      stdout: "pipe",
      stderr: "pipe",
    });
  // The first instance's UI is cancelled; the second's capture reaches both.
  const first = run({ TEST_CANCEL: "1" });
  let second;
  try {
    const deadline = Date.now() + 2_000;
    while (!(await readFile(env.TEST_NIRI_LOG, "utf8")).includes("msg action") && Date.now() < deadline) {
      await Bun.sleep(10);
    }
    second = run();
    const codes = await Promise.race([
      Promise.all([first.exited, second.exited]),
      Bun.sleep(6_000).then(() => "timeout"),
    ]);
    if (codes === "timeout") {
      first.kill();
      second.kill();
    }
    const stderr = (await Promise.all([first, second].map((p) => new Response(p.stderr).text()))).join("\n");
    expect(codes, stderr).toEqual([0, 0]);
    const runs = (await readFile(env.TEST_SATTY_RUNS, "utf8")).trim().split("\n");
    expect(runs).toHaveLength(1);
    expect(runs[0]).toContain(`niri-screenshot-${second.pid}.png`);
  } finally {
    first.kill();
    second?.kill();
    await rm(dir, { recursive: true, force: true });
  }
});

linuxTest("copy-png reoffers the image and deletes niri's entry without waiting for stdin EOF", async () => {
  const { dir, env } = await fixture();
  const proc = Bun.spawn([process.execPath, script, "--copy-png", "99", "100"], {
    env,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(png);
  await proc.stdin.flush();
  const code = await Promise.race([
    proc.exited,
    Bun.sleep(2_000).then(() => "timeout"),
  ]);
  if (code !== 0) proc.kill();
  const stderr = await new Response(proc.stderr).text();
  try {
    expect(code, stderr).toBe(0);
    expect(await readFile(env.TEST_COPY_ARGS, "utf8")).toBe("--type\nimage/png\n");
    expect(Buffer.compare(await readFile(env.TEST_COPY_LOG), png)).toBe(0);
    expect(await readFile(env.TEST_DELETE, "utf8")).toBe("99\n100\n");
  } finally {
    proc.kill();
    await rm(dir, { recursive: true, force: true });
  }
});
