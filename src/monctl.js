#!/usr/bin/env bun
/**
 * monctl – Monitor control via DDC/CI (input source, brightness).
 * Windows: Dxva2.dll via FFI | Linux: ddcutil
 */
import { parseArgs } from "node:util";
import { dlopen, FFIType, ptr, JSCallback } from "bun:ffi";
import { $ } from "bun";

const VCP_INPUT_SELECT = 0x60;
const VCP_BRIGHTNESS = 0x10;

const INPUT_SOURCES = new Map([
    ["vga", 0x01], ["vga1", 0x01], ["vga2", 0x02],
    ["dvi", 0x03], ["dvi1", 0x03], ["dvi2", 0x04],
    ["composite", 0x05], ["composite1", 0x05], ["composite2", 0x06],
    ["svideo", 0x07], ["svideo1", 0x07], ["svideo2", 0x08],
    ["tuner", 0x09], ["tuner1", 0x09], ["tuner2", 0x0a], ["tuner3", 0x0b],
    ["component", 0x0c], ["component1", 0x0c], ["component2", 0x0d], ["component3", 0x0e],
    ["dp", 0x0f], ["dp1", 0x0f], ["displayport", 0x0f], ["displayport1", 0x0f],
    ["dp2", 0x10], ["displayport2", 0x10],
    ["hdmi", 0x11], ["hdmi1", 0x11], ["hdmi2", 0x12], ["hdmi3", 0x13], ["hdmi4", 0x14],
]);

const INPUT_NAMES = new Map([
    [0x01, "VGA-1"], [0x02, "VGA-2"],
    [0x03, "DVI-1"], [0x04, "DVI-2"],
    [0x05, "Composite-1"], [0x06, "Composite-2"],
    [0x07, "S-Video-1"], [0x08, "S-Video-2"],
    [0x09, "Tuner-1"], [0x0a, "Tuner-2"], [0x0b, "Tuner-3"],
    [0x0c, "Component-1"], [0x0d, "Component-2"], [0x0e, "Component-3"],
    [0x0f, "DisplayPort-1"], [0x10, "DisplayPort-2"],
    [0x11, "HDMI-1"], [0x12, "HDMI-2"], [0x13, "HDMI-3"], [0x14, "HDMI-4"],
]);

function parseInputArg(arg) {
    const key = arg.toLowerCase().replace(/[-_\s]/g, "");
    if (INPUT_SOURCES.has(key)) return INPUT_SOURCES.get(key);
    const num = Number(arg);
    if (Number.isInteger(num) && num > 0 && num <= 255) return num;
    return null;
}

function parseBrightnessArg(raw) {
    const arg = raw.replace(/^=/, "");
    const m = arg.match(/^(\d+)([+-])?$/);
    if (!m) return null;
    const value = parseInt(m[1], 10);
    if (value > 100) return null;
    if (m[2] === "+") return { mode: "rel", delta: value };
    if (m[2] === "-") return { mode: "rel", delta: -value };
    return { mode: "abs", value };
}

function inputName(value) {
    return INPUT_NAMES.get(value) ?? `0x${value.toString(16).padStart(2, "0")}`;
}

function fmtHex(v) {
    return `0x${v.toString(16).padStart(2, "0")}`;
}

// ─── Windows ────────────────────────────────────────────────────────────

function openWinLibs() {
    const user32 = dlopen("user32.dll", {
        EnumDisplayMonitors: {
            args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
            returns: FFIType.i32,
        },
    });
    const dxva2 = dlopen("dxva2.dll", {
        GetNumberOfPhysicalMonitorsFromHMONITOR: {
            args: [FFIType.ptr, FFIType.ptr],
            returns: FFIType.i32,
        },
        GetPhysicalMonitorsFromHMONITOR: {
            args: [FFIType.ptr, FFIType.u32, FFIType.ptr],
            returns: FFIType.i32,
        },
        SetVCPFeature: {
            args: [FFIType.ptr, FFIType.u8, FFIType.u32],
            returns: FFIType.i32,
        },
        GetVCPFeatureAndVCPFeatureReply: {
            args: [FFIType.ptr, FFIType.u8, FFIType.ptr, FFIType.ptr, FFIType.ptr],
            returns: FFIType.i32,
        },
        DestroyPhysicalMonitor: {
            args: [FFIType.ptr],
            returns: FFIType.i32,
        },
        GetCapabilitiesStringLength: {
            args: [FFIType.ptr, FFIType.ptr],
            returns: FFIType.i32,
        },
        CapabilitiesRequestAndCapabilitiesReply: {
            args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
            returns: FFIType.i32,
        },
    });
    return {
        sym: { ...user32.symbols, ...dxva2.symbols },
        close: () => { user32.close(); dxva2.close(); },
    };
}

// PHYSICAL_MONITOR struct: HANDLE (8 bytes) + WCHAR[128] (256 bytes) = 264
const PHYSICAL_MONITOR_SIZE = 264;

function winEnumPhysicalMonitors(sym) {
    const hMonitors = [];
    const cb = new JSCallback(
        (hMon) => { hMonitors.push(hMon); return 1; },
        { returns: FFIType.i32, args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr] },
    );
    sym.EnumDisplayMonitors(null, null, cb.ptr, 0);
    cb.close();

    const monitors = [];
    for (const hMon of hMonitors) {
        const countBuf = new Uint32Array(1);
        if (!sym.GetNumberOfPhysicalMonitorsFromHMONITOR(hMon, ptr(countBuf))) continue;
        const count = countBuf[0];
        if (!count) continue;

        const buf = new Uint8Array(count * PHYSICAL_MONITOR_SIZE);
        if (!sym.GetPhysicalMonitorsFromHMONITOR(hMon, count, ptr(buf))) continue;

        for (let i = 0; i < count; i++) {
            const off = i * PHYSICAL_MONITOR_SIZE;
            const dv = new DataView(buf.buffer, off, 8);
            const handle = dv.getUint32(0, true) + dv.getUint32(4, true) * 0x100000000;
            const chars = new Uint16Array(buf.buffer, off + 8, 128);
            let desc = "";
            for (let j = 0; j < 128 && chars[j]; j++) desc += String.fromCharCode(chars[j]);
            monitors.push({ handle, description: desc });
        }
    }
    return monitors;
}

function winReadVcp(sym, handle, code) {
    const typeBuf = new Uint32Array(1);
    const curBuf = new Uint32Array(1);
    const maxBuf = new Uint32Array(1);
    if (!sym.GetVCPFeatureAndVCPFeatureReply(handle, code, ptr(typeBuf), ptr(curBuf), ptr(maxBuf)))
        return null;
    return { current: curBuf[0], max: maxBuf[0] };
}

function winGetCapabilities(sym, handle) {
    const lenBuf = new Uint32Array(1);
    if (!sym.GetCapabilitiesStringLength(handle, ptr(lenBuf))) return null;
    const len = lenBuf[0];
    if (!len) return null;
    const buf = new Uint8Array(len);
    if (!sym.CapabilitiesRequestAndCapabilitiesReply(handle, ptr(buf), len)) return null;
    return new TextDecoder().decode(buf).replace(/\0+$/, "");
}

function parseInputValuesFromCaps(capsStr) {
    const m = capsStr.match(/\b60\(([^)]+)\)/);
    if (!m) return null;
    return m[1].trim().split(/\s+/).map(v => parseInt(v, 16));
}

function winStatus(sym, monitors, monitorSel, showCaps) {
    const targets = resolveTargets(monitors, monitorSel);
    for (const i of targets) {
        const m = monitors[i];
        const label = m.description || "(unknown)";

        const inp = winReadVcp(sym, m.handle, VCP_INPUT_SELECT);
        const brt = winReadVcp(sym, m.handle, VCP_BRIGHTNESS);

        const parts = [` ${i}: ${label}`];
        if (inp) parts.push(`input=${inputName(inp.current)} (${fmtHex(inp.current)})`);
        if (brt) parts.push(`brightness=${brt.current}/${brt.max}`);
        if (!inp && !brt) parts.push("(DDC/CI read failed)");
        console.log(parts.join("  "));

        if (showCaps) {
            const caps = winGetCapabilities(sym, m.handle);
            if (caps) {
                const vals = parseInputValuesFromCaps(caps);
                if (vals) {
                    const names = vals.map(v => `${inputName(v)} (${fmtHex(v)})`);
                    console.log(`    inputs: ${names.join(", ")}`);
                } else {
                    console.log(`    caps (raw): ${caps}`);
                }
            } else {
                console.log("    caps: (query failed)");
            }
        }
    }
}

function winSetInput(sym, monitors, monitorSel, inputValue) {
    const targets = resolveTargets(monitors, monitorSel);
    for (const i of targets) {
        const m = monitors[i];
        if (!sym.SetVCPFeature(m.handle, VCP_INPUT_SELECT, inputValue)) {
            console.error(`Monitor ${i}: SetVCPFeature(input) failed`);
            continue;
        }
        console.log(`Monitor ${i}: ${m.description || "(unknown)"} input -> ${inputName(inputValue)}`);
    }
}

function winSetBrightness(sym, monitors, monitorSel, bright) {
    const targets = resolveTargets(monitors, monitorSel);
    for (const i of targets) {
        const m = monitors[i];
        const label = m.description || "(unknown)";
        let value;
        if (bright.mode === "abs") {
            value = bright.value;
        } else {
            const cur = winReadVcp(sym, m.handle, VCP_BRIGHTNESS);
            if (!cur) {
                console.error(`Monitor ${i}: brightness read failed, cannot apply relative adjustment`);
                continue;
            }
            value = Math.max(0, Math.min(cur.max, cur.current + bright.delta));
        }
        if (!sym.SetVCPFeature(m.handle, VCP_BRIGHTNESS, value)) {
            console.error(`Monitor ${i}: SetVCPFeature(brightness) failed`);
            continue;
        }
        console.log(`Monitor ${i}: ${label} brightness -> ${value}`);
    }
}

async function windowsImpl(opts) {
    const { sym, close } = openWinLibs();
    const monitors = winEnumPhysicalMonitors(sym);

    if (!monitors.length) {
        console.error("No physical monitors found (DDC/CI may not be supported)");
        process.exit(1);
    }

    try {
        if (opts.inputValue != null) {
            winSetInput(sym, monitors, opts.monitorSel, opts.inputValue);
        } else if (opts.brightness != null) {
            winSetBrightness(sym, monitors, opts.monitorSel, opts.brightness);
        } else {
            winStatus(sym, monitors, opts.monitorSel, opts.showCaps);
        }
    } finally {
        for (const m of monitors) sym.DestroyPhysicalMonitor(m.handle);
        close();
    }
}

// ─── Linux ──────────────────────────────────────────────────────────────

async function linuxDetectDisplays() {
    const out = (await $`ddcutil detect`.nothrow().quiet()).stdout.toString();
    const displays = [];
    for (const block of out.split(/(?=Display\s+\d+)/)) {
        const numMatch = block.match(/Display\s+(\d+)/);
        if (!numMatch) continue;
        const num = parseInt(numMatch[1], 10);
        const modelMatch = block.match(/Model:\s*(.+)/i);
        const description = modelMatch ? modelMatch[1].trim() : "";
        displays.push({ num, description });
    }
    return displays.length ? displays : [{ num: 1, description: "" }];
}

async function linuxImpl(opts) {
    if (!Bun.which("ddcutil")) {
        console.error("ddcutil not found - install it (e.g. apt install ddcutil)");
        process.exit(1);
    }

    const displays = await linuxDetectDisplays();
    const targetIdxs = resolveTargets(displays, opts.monitorSel);

    if (opts.inputValue != null) {
        const hex = fmtHex(opts.inputValue);
        for (const i of targetIdxs) {
            const d = displays[i].num;
            const display = String(d);
            const r = await $`ddcutil setvcp 0x60 ${hex} --display ${display}`.nothrow().quiet();
            if (r.exitCode !== 0) {
                console.error(`Display ${d}: ${r.stderr.toString().trim() || "set failed"}`);
            } else {
                console.log(`Display ${d}: input -> ${inputName(opts.inputValue)}`);
            }
        }
    } else if (opts.brightness != null) {
        for (const i of targetIdxs) {
            const d = displays[i].num;
            const display = String(d);
            let value;
            if (opts.brightness.mode === "abs") {
                value = opts.brightness.value;
            } else {
                const r = await $`ddcutil getvcp 0x10 --display ${display} --brief`.nothrow().quiet();
                if (r.exitCode !== 0) {
                    console.error(`Display ${d}: brightness read failed`);
                    continue;
                }
                const m = r.stdout.toString().match(/current\s*=?\s*(\d+).*?max\s*=?\s*(\d+)/i)
                    ?? r.stdout.toString().match(/C\s+(\d+)\s+(\d+)/);
                if (!m) {
                    console.error(`Display ${d}: could not parse brightness`);
                    continue;
                }
                const cur = parseInt(m[1], 10);
                const max = parseInt(m[2], 10);
                value = Math.max(0, Math.min(max, cur + opts.brightness.delta));
            }
            const val = String(value);
            const r = await $`ddcutil setvcp 0x10 ${val} --display ${display}`.nothrow().quiet();
            if (r.exitCode !== 0) {
                console.error(`Display ${d}: ${r.stderr.toString().trim() || "brightness set failed"}`);
            } else {
                console.log(`Display ${d}: brightness -> ${value}`);
            }
        }
    } else {
        for (const i of targetIdxs) {
            const d = displays[i].num;
            const display = String(d);
            const ri = await $`ddcutil getvcp 0x60 --display ${display}`.nothrow().quiet();
            const rb = await $`ddcutil getvcp 0x10 --display ${display}`.nothrow().quiet();
            const parts = [`Display ${d}:`];
            if (ri.exitCode === 0) parts.push(ri.stdout.toString().trim());
            if (rb.exitCode === 0) parts.push(rb.stdout.toString().trim());
            if (parts.length === 1) parts.push("(DDC/CI read failed)");
            console.log(parts.join("  "));
        }
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function resolveTargets(monitors, monitorSel) {
    if (monitorSel == null) return monitors.map((_, i) => i);
    if (typeof monitorSel === "number") {
        if (!monitors[monitorSel]) {
            console.error(`Monitor index ${monitorSel} out of range (0-${monitors.length - 1})`);
            process.exit(1);
        }
        return [monitorSel];
    }
    const keyword = monitorSel.toLowerCase();
    const matches = [];
    for (let i = 0; i < monitors.length; i++) {
        if ((monitors[i].description || "").toLowerCase().includes(keyword)) matches.push(i);
    }
    if (!matches.length) {
        console.error(`No monitor matching "${monitorSel}"`);
        process.exit(1);
    }
    return matches;
}

// ─── Main ───────────────────────────────────────────────────────────────

const USAGE = `monctl - Monitor control via DDC/CI

Usage:
  monctl                       Show all monitors (input + brightness)
  monctl -c                    Show monitors with DDC/CI capabilities
  monctl <input> [-m SEL]      Set input source (by name or VCP value)
  monctl -b <val> [-m SEL]     Set brightness (0-100, or n+/n- for relative)
  monctl -l                    List known input source names

Examples:
  monctl -b 50                 Set brightness to 50 on all monitors
  monctl -b 10+ -m 1           Increase brightness by 10 on monitor 1
  monctl -b 20-                Decrease brightness by 20
  monctl dp -m 1               Switch monitor 1 to DisplayPort
  monctl dp -m G95NC           Switch monitor matching "G95NC" to DisplayPort
  monctl 5 -m 1                Set input to VCP value 5

Monitor selector (-m) is a 0-based index or a keyword matched against the
monitor description (case-insensitive substring match).`;

async function main() {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: {
            monitor: { type: "string", short: "m" },
            brightness: { type: "string", short: "b" },
            caps: { type: "boolean", short: "c" },
            list: { type: "boolean", short: "l" },
            help: { type: "boolean", short: "h" },
        },
    });

    if (values.help) {
        console.log(USAGE);
        process.exit(0);
    }

    if (values.list) {
        for (const [value, name] of INPUT_NAMES) {
            const aliases = [...INPUT_SOURCES.entries()]
                .filter(([, v]) => v === value)
                .map(([k]) => k);
            console.log(`  ${fmtHex(value)}  ${name.padEnd(16)} ${aliases.join(", ")}`);
        }
        return;
    }

    let monitorSel = null;
    if (values.monitor != null) {
        const n = parseInt(values.monitor, 10);
        monitorSel = String(n) === values.monitor ? n : values.monitor;
    }
    let inputValue = null;
    let brightness = null;

    if (values.brightness != null) {
        brightness = parseBrightnessArg(values.brightness);
        if (!brightness) {
            console.error(`Invalid brightness value: ${values.brightness}`);
            console.error("Use 0-100 for absolute, n+/n- for relative.");
            process.exit(1);
        }
    }

    if (positionals.length > 0) {
        inputValue = parseInputArg(positionals[0]);
        if (inputValue == null) {
            console.error(`Unknown input source: ${positionals[0]}`);
            console.error("Use -l to list known names, or pass a numeric VCP value.");
            process.exit(1);
        }
    }

    if (inputValue != null && brightness != null) {
        console.error("Cannot set both input and brightness in the same command.");
        process.exit(1);
    }

    const opts = { inputValue, brightness, monitorSel, showCaps: values.caps };

    if (process.platform === "win32") {
        await windowsImpl(opts);
    } else if (process.platform === "linux") {
        await linuxImpl(opts);
    } else {
        console.error(`Unsupported platform: ${process.platform}`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
});
