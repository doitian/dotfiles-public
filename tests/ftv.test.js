import { expect, spyOn, test } from "bun:test";
import { chmod, mkdtemp, readFile, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlaylist, parsePlaylist } from "../src/ftv.js";

const PLAYLIST = `#EXTM3U
#EXTINF:-1 tvg-name="CCTV1" group-title="央视频道", CCTV1
http://example.test/live/1.m3u8
#EXTINF:-1 group-title="News, international", News, World
#EXTVLCOPT:http-referrer=https://example.test/
https://example.test/live/2.m3u8?key=a&b=c
`;

const CHANNELS = [
  { name: "CCTV1", group: "央视频道", url: "http://example.test/live/1.m3u8" },
  { name: "News, World", group: "News, international", url: "https://example.test/live/2.m3u8?key=a&b=c" },
];

test.skipIf(process.platform === "win32")("ftv CLI defaults to errors and forwards chosen mpv log levels", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ftv-cli-"));
  try {
    await Bun.write(join(dir, "fzf"), '#!/bin/sh\nIFS= read -r row\nprintf "%s\\n" "$row"\n');
    await Bun.write(join(dir, "mpv"), '#!/bin/sh\nprintf "%s\\n" "$@"\nexit "${FTV_MPV_EXIT:-0}"\n');
    for (const command of ["fzf", "mpv"]) await chmod(join(dir, command), 0o755);
    await Bun.write(join(dir, "ftv", "iptv4.m3u"), PLAYLIST);
    const env = { ...process.env, PATH: dir + delimiter + process.env.PATH, XDG_CACHE_HOME: dir };
    const script = fileURLToPath(new URL("../src/ftv.js", import.meta.url));
    const run = async (args, overrides = {}) => {
      const child = Bun.spawn([process.execPath, script, ...args], {
        env: { ...env, ...overrides },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      return { stdout, stderr, code };
    };

    for (const [args, level] of [
      [[], "error"],
      [["--log-level", "info"], "info"],
      [["-l", "debug"], "debug"],
      [["--log-level=no"], "no"],
    ]) {
      const result = await run(args);
      expect(result.code).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout.trim().split("\n")).toEqual([
        "--quiet", `--msg-level=all=${level}`, "--force-media-title=CCTV1", "--", CHANNELS[0].url,
      ]);
    }

    const invalid = await run(["--log-level", "bogus"]);
    expect(invalid.code).toBe(1);
    expect(invalid.stderr).toContain('invalid log level "bogus"');
    expect(invalid.stdout).toBe("");
    expect((await run(["--log-level"])).code).toBe(1);
    expect((await run([], { FTV_MPV_EXIT: "7" })).code).toBe(7);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("ftv parses names, groups, CRLF, and intervening comments", () => {
  expect(parsePlaylist(PLAYLIST)).toEqual(CHANNELS);
  expect(parsePlaylist("\uFEFF" + PLAYLIST.replaceAll("\n", "\r\n"))).toEqual(CHANNELS);
});

test("ftv skips missing metadata, missing URLs, and non-HTTP streams", () => {
  expect(parsePlaylist(`https://example.test/orphan
#EXTINF:-1, Missing
#EXTINF:-1, Unsupported
file:///tmp/video
#EXTINF:-1,
https://example.test/unnamed
#EXTINF:-1, Good
https://example.test/good
https://example.test/extra
#EXTINF:-1, No URL
`)).toEqual([{ name: "Good", group: "", url: "https://example.test/good" }]);
  expect(parsePlaylist("<html>Not a playlist</html>")).toEqual([]);
});

test("ftv downloads, caches, refreshes, and rejects bad downloads", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ftv-test-"));
  const cachePath = join(dir, "cache", "iptv4.m3u");
  const fetch = spyOn(globalThis, "fetch").mockImplementation(async () => new Response(PLAYLIST));
  try {
    expect(await loadPlaylist(cachePath)).toEqual(CHANNELS);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("https://live.zbds.top/tv/iptv4.m3u");
    expect(await readFile(cachePath, "utf8")).toBe(PLAYLIST);

    expect(await loadPlaylist(cachePath)).toEqual(CHANNELS);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await loadPlaylist(cachePath, true)).toEqual(CHANNELS);
    expect(fetch).toHaveBeenCalledTimes(2);

    const expired = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await utimes(cachePath, expired, expired);
    expect(await loadPlaylist(cachePath)).toEqual(CHANNELS);
    expect(fetch).toHaveBeenCalledTimes(3);

    await Bun.write(cachePath, "broken cache");
    expect(await loadPlaylist(cachePath)).toEqual(CHANNELS);
    expect(fetch).toHaveBeenCalledTimes(4);

    fetch.mockImplementation(async () => new Response("unavailable", { status: 503 }));
    await expect(loadPlaylist(cachePath, true)).rejects.toThrow("HTTP 503");
    expect(await readFile(cachePath, "utf8")).toBe(PLAYLIST);

    fetch.mockImplementation(async () => new Response("<html>Not a playlist</html>"));
    await expect(loadPlaylist(cachePath, true)).rejects.toThrow("no channels");
    expect(await readFile(cachePath, "utf8")).toBe(PLAYLIST);
  } finally {
    fetch.mockRestore();
    await rm(dir, { recursive: true, force: true });
  }
});
