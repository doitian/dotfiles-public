#!/usr/bin/env bun
import { $ } from "bun";

const PORT = parseInt(process.env.PORT || "8787", 10);

// App-ids that use Ctrl+Shift+V for paste instead of Ctrl+V
const SHIFT_PASTE_APP_IDS = new Set(["kitty", "org.kde.konsole", "foot", "alacritty", "wezterm"]);

// ydotool key args (press:1 release:0) from linux/input-event-codes.h
// KEY_LEFTCTRL=29, KEY_LEFTSHIFT=42, KEY_V=47
const PASTE_KEYS = ["29:1", "47:1", "47:0", "29:0"]; // Ctrl+V
const PASTE_SHIFT_KEYS = ["29:1", "42:1", "47:1", "47:0", "42:0", "29:0"]; // Ctrl+Shift+V

// KEY_LEFTCTRL=29, KEY_U=22, KEY_BACKSPACE=14
const KEY_ARGS = {
    backspace: ["14:1", "14:0"],
    "c-backspace": ["29:1", "14:1", "14:0", "29:0"],
    "c-u": ["29:1", "22:1", "22:0", "29:0"],
};

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>niri-remote-type</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 0 1rem; }
  textarea { width: 100%; height: 8rem; font-size: 1rem; padding: .5rem; margin-bottom: .75rem; resize: vertical; }
  #status { margin-top: .75rem; font-size: .875rem; color: #666; min-height: 1.25rem; }
  #keepAwakeBtn { margin-top: .75rem; padding: .4rem .8rem; font-size: .875rem; cursor: pointer; }
  #keepAwakeBtn.active { background: #080; color: #fff; border-color: #060; }
</style>
</head>
<body>
<h2>niri-remote-type</h2>
<textarea id="txt" placeholder="Type text to paste..." autofocus></textarea>
<div id="status"></div>
<button id="keepAwakeBtn">Keep Awake</button>
<script>
const txt = document.getElementById("txt");
const status = document.getElementById("status");

function setStatus(msg, ok) {
    status.textContent = msg;
    status.style.color = ok ? "#080" : "#c00";
}

async function send(url, body) {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        setStatus(data.ok ? "OK" : "Error: " + (data.error || "unknown"), data.ok);
        return data.ok;
    } catch (e) {
        setStatus("Error: " + e.message, false);
        return false;
    }
}

let idleTimer = null;
let sentPrefix = "";

txt.addEventListener("input", () => {
    clearTimeout(idleTimer);
    if (!txt.value) { sentPrefix = ""; return; }
    idleTimer = setTimeout(async () => {
        const full = txt.value;
        if (!full) return;
        const textToSend = sentPrefix && full.startsWith(sentPrefix)
            ? full.slice(sentPrefix.length)
            : full;
        if (!textToSend) return;
        if (await send("/paste", { text: textToSend })) {
            if (txt.value === full) {
                txt.value = "";
                sentPrefix = "";
            } else {
                sentPrefix = full;
            }
        }
    }, 300);
});

txt.addEventListener("keydown", (e) => {
    if (txt.value) return;
    let key = null;
    if (e.ctrlKey && e.key === "u") key = "c-u";
    else if (e.ctrlKey && e.key === "Backspace") key = "c-backspace";
    else if (e.key === "Backspace") key = "backspace";
    if (key) {
        e.preventDefault();
        send("/key", { key });
    }
});

let wakeLock = null;
const keepAwakeBtn = document.getElementById("keepAwakeBtn");

if (!("wakeLock" in navigator)) {
    keepAwakeBtn.disabled = true;
    keepAwakeBtn.textContent = "Keep Awake (unsupported)";
} else {
    async function requestWakeLock() {
        try {
            wakeLock = await navigator.wakeLock.request("screen");
            wakeLock.addEventListener("release", () => {
                wakeLock = null;
                keepAwakeBtn.classList.remove("active");
                keepAwakeBtn.textContent = "Keep Awake";
            });
            keepAwakeBtn.classList.add("active");
            keepAwakeBtn.textContent = "Awake (tap to release)";
        } catch (err) {
            setStatus(err.name + ": " + err.message, false);
        }
    }

    keepAwakeBtn.addEventListener("click", () => {
        if (wakeLock) {
            wakeLock.release();
        } else {
            requestWakeLock();
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (wakeLock !== null && document.visibilityState === "visible") {
            requestWakeLock();
        }
    });
}
</script>
</body>
</html>`;

Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);

        if (req.method === "GET" && url.pathname === "/") {
            return new Response(HTML, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }

        if (req.method === "POST" && url.pathname === "/paste") {
            const { text } = await req.json();
            if (typeof text !== "string" || !text) {
                return Response.json({ ok: false, error: "missing text" }, { status: 400 });
            }

            const copyR = await $`wl-copy -- ${text}`.quiet().nothrow();
            if (copyR.exitCode !== 0) {
                return Response.json(
                    { ok: false, error: copyR.stderr.toString().trim() },
                    { status: 500 },
                );
            }

            let appId = "";
            const focusedR = await $`niri msg --json focused-window`.quiet().nothrow();
            if (focusedR.exitCode === 0) {
                try {
                    const win = JSON.parse(focusedR.stdout.toString());
                    appId = win?.app_id ?? "";
                } catch {
                    // ignore parse errors
                }
            }

            const pasteKeys = SHIFT_PASTE_APP_IDS.has(appId) ? PASTE_SHIFT_KEYS : PASTE_KEYS;
            const r = await $`ydotool key ${pasteKeys}`.quiet().nothrow();
            if (r.exitCode !== 0) {
                return Response.json(
                    { ok: false, error: r.stderr.toString().trim() },
                    { status: 500 },
                );
            }

            return Response.json({ ok: true });
        }

        if (req.method === "POST" && url.pathname === "/key") {
            const { key } = await req.json();
            const args = KEY_ARGS[key];
            if (!args) {
                return Response.json({ ok: false, error: "unknown key" }, { status: 400 });
            }
            const r = await $`ydotool key ${args}`.quiet().nothrow();
            if (r.exitCode !== 0) {
                return Response.json(
                    { ok: false, error: r.stderr.toString().trim() },
                    { status: 500 },
                );
            }
            return Response.json({ ok: true });
        }

        return new Response("Not Found", { status: 404 });
    },
});

console.log(`niri-remote-type listening on http://0.0.0.0:${PORT}`);
