#!/usr/bin/env bun
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { $ } from "bun";
import { home } from "./lib/env.js";

const PLAYLIST_URL = "https://live.zbds.top/tv/iptv4.m3u";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOG_LEVELS = ["no", "fatal", "error", "warn", "info", "v", "debug", "trace"];
const USAGE = `Usage: ftv [-r] [-l level] [query]

Select an IPTV channel with fzf and play it with mpv.

  -r, --refresh    Download the playlist again (cached for 24 hours)
  -l, --log-level  mpv output level (default: error)
                   ${LOG_LEVELS.join(", ")}
  -h, --help       Show this help`;

export function parsePlaylist(text) {
  const channels = [];
  let channel;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("#EXTINF:")) {
      const name = line.match(/^#EXTINF:(?:[^",]|"[^"]*")*,(.*)$/)?.[1].trim();
      const group = line.match(/group-title="([^"]*)"/)?.[1] ?? "";
      channel = name ? { name: name.replace(/\t/g, " "), group: group.replace(/\t/g, " ") } : undefined;
    } else if (line && !line.startsWith("#")) {
      if (channel && /^https?:\/\//i.test(line)) channels.push({ ...channel, url: line });
      channel = undefined;
    }
  }
  return channels;
}

export async function loadPlaylist(cachePath, refresh = false) {
  if (!refresh) {
    try {
      if (Date.now() - (await stat(cachePath)).mtimeMs < CACHE_TTL_MS) {
        const channels = parsePlaylist(await readFile(cachePath, "utf8"));
        if (channels.length) return channels;
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const response = await fetch(PLAYLIST_URL, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`playlist download failed: HTTP ${response.status}`);
  const text = await response.text();
  const channels = parsePlaylist(text);
  if (!channels.length) throw new Error("playlist contains no channels");
  await mkdir(dirname(cachePath), { recursive: true });
  await Bun.write(cachePath, text);
  return channels;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      refresh: { type: "boolean", short: "r" },
      "log-level": { type: "string", short: "l", default: "error" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const logLevel = values["log-level"];
  if (!LOG_LEVELS.includes(logLevel)) {
    throw new Error(`invalid log level "${logLevel}" (expected ${LOG_LEVELS.join(", ")})`);
  }
  for (const command of ["fzf", "mpv"]) {
    if (!Bun.which(command)) throw new Error(`${command} is not installed`);
  }

  const cacheDir = process.env.XDG_CACHE_HOME || join(home(), ".cache");
  const channels = await loadPlaylist(join(cacheDir, "ftv", "iptv4.m3u"), values.refresh);
  const rows = channels.map((channel, index) => `${index}\t${channel.name}\t${channel.group}`);
  const picker = Bun.spawn([
    "fzf", "--no-multi", "--delimiter=\t", "--with-nth=2..",
    "--prompt=Channel> ", `--query=${positionals.join(" ")}`,
  ], {
    stdin: new Blob([rows.join("\n") + "\n"]),
    stdout: "pipe",
    stderr: "inherit",
  });
  const selected = (await new Response(picker.stdout).text()).trim();
  const code = await picker.exited;
  if (code !== 0) process.exit(code);
  if (!selected) return;
  const channel = channels[Number(selected.split("\t")[0])];
  if (!channel) throw new Error("invalid channel selection");
  const result = await $`mpv --quiet --msg-level=all=${logLevel} --force-media-title=${channel.name} -- ${channel.url}`.nothrow();
  process.exit(result.exitCode);
}

if (import.meta.main || Bun.isStandaloneExecutable) await main().catch((error) => {
  console.error(`ftv: ${error.message}`);
  process.exit(1);
});
