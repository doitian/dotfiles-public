#!/usr/bin/env bun
/**
 * Activate mise in neovim: write mise shims and env to .lazy.lua.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { $ } from "bun";

async function getMiseShimsPath() {
    const r = await $`mise activate fish --shims`.quiet().nothrow();
    const stdout = (r.stdout?.toString() ?? "").trim();
    if (r.exitCode !== 0 || !stdout) return null;
    const re = /^fish_add_path\s+.*\s+(?:'([^']+)'|(\S+))$/;
    for (const line of stdout.split("\n")) {
        const m = line.match(re);
        if (m) {
            const path = m[1] || m[2] || "";
            if (path.includes("shims")) return path;
        }
    }
    return null;
}

async function getMiseEnv() {
    try {
        const r = await $`mise env -J`.quiet().nothrow();
        const stdout = (r.stdout?.toString() ?? "").trim();
        if (r.exitCode !== 0 || !stdout) return {};
        return JSON.parse(stdout);
    } catch {
        return {};
    }
}

function escapeLua(s) {
    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function generateMiseSection(shimsPath, miseEnv) {
    const lines = [
        "--- mise",
        `vim.env.PATH = "${escapeLua(shimsPath)}" .. ":" .. vim.env.PATH`,
    ];
    for (const key of Object.keys(miseEnv).sort()) {
        if (key === "PATH" || key === "Path") continue;
        const value = String(miseEnv[key]);
        lines.push(`vim.env.${key} = "${escapeLua(value)}"`);
    }
    lines.push("---");
    return lines.join("\n");
}

async function main() {
    const shimsPath = await getMiseShimsPath();
    if (!shimsPath) {
        console.error("Error: Could not find mise shims path");
        process.exit(1);
    }
    const miseEnv = await getMiseEnv();
    const miseSection = generateMiseSection(shimsPath, miseEnv);
    const lazyFile = ".lazy.lua";

    let newContent;
    if (existsSync(lazyFile)) {
        const content = readFileSync(lazyFile, "utf8");
        const pattern = /--- mise\n[\s\S]*?\n---/;
        if (pattern.test(content)) {
            newContent = content.replace(pattern, miseSection);
        } else {
            const returnMatch = content.match(/^return\s*\{\s*\}\s*$/m);
            if (returnMatch) {
                const idx = content.indexOf(returnMatch[0]);
                newContent =
                    content.slice(0, idx) + miseSection + "\n\n" + content.slice(idx);
            } else {
                newContent = miseSection + "\n\n" + content;
            }
        }
    } else {
        newContent = miseSection + "\n\nreturn {}\n";
    }

    writeFileSync(lazyFile, newContent);
    console.log(`Updated ${lazyFile} with mise shims path and environment variables: ${shimsPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
