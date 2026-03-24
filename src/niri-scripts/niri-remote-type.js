#!/usr/bin/env bun
import { $ } from "bun";

const PORT = parseInt(process.env.PORT || "8787", 10);

// App-ids that use Ctrl+Shift+V for paste instead of Ctrl+V
const SHIFT_PASTE_APP_IDS = new Set(["kitty", "org.kde.konsole", "foot", "alacritty", "wezterm"]);

// ydotool key args (press:1 release:0) from linux/input-event-codes.h
// KEY_LEFTCTRL=29, KEY_LEFTSHIFT=42, KEY_V=47
const PASTE_KEYS = ["29:1", "47:1", "47:0", "29:0"]; // Ctrl+V
const PASTE_SHIFT_KEYS = ["29:1", "42:1", "47:1", "47:0", "42:0", "29:0"]; // Ctrl+Shift+V

// ydotool key args (press:1 release:0) from linux/input-event-codes.h
// KEY_ESC=1, KEY_BACKSPACE=14, KEY_ENTER=28, KEY_A=30, KEY_U=22
const KEY_ARGS = {
    enter: ["28:1", "28:0"],
    esc: ["1:1", "1:0"],
    backspace: ["14:1", "14:0"],
    "c-u": ["29:1", "22:1", "22:0", "29:0"],
    "c-a": ["29:1", "30:1", "30:0", "29:0"],
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
  .buttons { display: flex; flex-wrap: wrap; gap: .5rem; }
  button { font-size: 1rem; padding: .5rem 1rem; cursor: pointer; }
  #status { margin-top: .75rem; font-size: .875rem; color: #666; min-height: 1.25rem; }
</style>
</head>
<body>
<h2>niri-remote-type</h2>
<textarea id="txt" placeholder="Type text to paste..." autofocus></textarea>
<div class="buttons">
  <button data-action="paste">Paste</button>
  <button data-key="enter">Enter</button>
  <button data-key="esc">Esc</button>
  <button data-key="c-u">C-U</button>
  <button data-key="c-a">C-A</button>
  <button data-key="backspace">Backspace</button>
</div>
<div id="status"></div>
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
    } catch (e) {
        setStatus("Error: " + e.message, false);
    }
}

document.querySelector('[data-action="paste"]').addEventListener("click", () => {
    const text = txt.value;
    if (!text) return;
    send("/paste", { text });
    txt.value = "";
    txt.focus();
});

txt.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const text = txt.value;
        if (!text) return;
        send("/paste", { text, sendEnter: true });
        txt.value = "";
    } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const text = txt.value;
        if (!text) return;
        send("/paste", { text });
        txt.value = "";
    }
});

document.querySelectorAll("[data-key]").forEach(btn => {
    btn.addEventListener("click", () => {
        send("/key", { key: btn.dataset.key });
        txt.focus();
    });
});
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
            const { text, sendEnter } = await req.json();
            if (typeof text !== "string" || !text) {
                return Response.json({ ok: false, error: "missing text" }, { status: 400 });
            }

            // Save text to clipboard
            const copyR = await $`wl-copy -- ${text}`.quiet().nothrow();
            if (copyR.exitCode !== 0) {
                return Response.json(
                    { ok: false, error: copyR.stderr.toString().trim() },
                    { status: 500 },
                );
            }

            // Get focused window app_id to choose paste shortcut
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
            const allKeys = sendEnter ? [...pasteKeys, ...KEY_ARGS.enter] : pasteKeys;
            const r = await $`ydotool key ${allKeys}`.quiet().nothrow();
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
            if (typeof key !== "string") {
                return Response.json({ ok: false, error: "missing key" }, { status: 400 });
            }
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
