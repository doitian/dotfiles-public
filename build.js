#!/usr/bin/env bun
/**
 * Compile each bin entrypoint to a standalone executable in dist/.
 * Run: bun run build
 * Skips a target if it is newer than the source entry, mise.local.toml (if present), and all src/lib/*.
 */
import { readFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const bin = pkg.bin;
if (!bin || typeof bin !== "object") {
    console.error("No bin map in package.json");
    process.exit(1);
}

const distDir = "./dist";
if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
}

// Inject config from env at build time (Bun memory file entries)
function getEnvConfig(name) {
    const val = process.env[name];
    return val != null && val !== "" ? JSON.stringify(val) : "undefined";
}
const configVars = [
    ["DEFAULT_OPENAI_API_KEY", "OPENAI_API_KEY"],
    ["DEFAULT_OPENAI_BASE_URL", "OPENAI_BASE_URL"],
    ["DEFAULT_OPENAI_MODEL", "OPENAI_MODEL"],
    ["DEFAULT_PUSHOVER_USER_KEY", "PUSHOVER_USER_KEY"],
    ["DEFAULT_PUSHOVER_AGENT_TOKEN", "PUSHOVER_AGENT_TOKEN"],
    ["DEFAULT_PUSHOVER_PERSONAL_TOKEN", "PUSHOVER_PERSONAL_TOKEN"],
];
const configSource = configVars
    .map(
        ([exportName, envName]) =>
            `export const ${exportName} = ${getEnvConfig(envName)};`
    )
    .join("\n") + "\n";

// Merge package.json bin and private src into one list: { name, sourcePath, configSource? }
const entries = [];
for (const name of Object.keys(bin)) {
    entries.push({
        name,
        sourcePath: `./src/${name}.js`,
    });
}
const privateSrcDir = join(process.cwd(), "..", "private", "src");
if (existsSync(privateSrcDir)) {
    for (const f of readdirSync(privateSrcDir)) {
        if (!f.endsWith(".js")) continue;
        entries.push({
            name: f.slice(0, -3),
            sourcePath: join(privateSrcDir, f),
        });
    }
}

const libDir = join(process.cwd(), "src", "lib");
const miseLocalPath = join(process.cwd(), "mise.local.toml");

/** Return the newest mtime among source entry, mise.local.toml (if any), and all files in src/lib. */
function getNewestInputMtime(sourcePath) {
    let newest = 0;
    try {
        const s = statSync(sourcePath);
        if (s.mtimeMs > newest) newest = s.mtimeMs;
    } catch (_) { }
    if (existsSync(miseLocalPath)) {
        const m = statSync(miseLocalPath).mtimeMs;
        if (m > newest) newest = m;
    }
    if (existsSync(libDir)) {
        for (const f of readdirSync(libDir)) {
            const p = join(libDir, f);
            try {
                const st = statSync(p);
                if (st.mtimeMs > newest) newest = st.mtimeMs;
            } catch (_) { }
        }
    }
    return newest;
}

/** Return outfile mtime in ms, or 0 if missing. Handles .exe on Windows. */
function getOutputMtime(outfile) {
    for (const p of [outfile, outfile + ".exe"]) {
        if (existsSync(p)) return statSync(p).mtimeMs;
    }
    return 0;
}

async function buildOne({ sourcePath, outfile }) {
    const options = {
        entrypoints: [sourcePath],
        outfile,
        minify: true,
        compile: { outfile },
    };
    options.files = { "./lib/config.js": configSource };
    const result = await Bun.build(options);
    if (!result.success) {
        console.error(result.logs);
        process.exit(1);
    }
    return result.outputs[0].path;
}

for (const { name, sourcePath } of entries) {
    const outfile = join(distDir, name);
    const outMtime = getOutputMtime(outfile);
    const newestInput = getNewestInputMtime(sourcePath);
    if (outMtime >= newestInput && outMtime > 0) {
        console.log(`Skipping ${sourcePath} (up to date)`);
        continue;
    }
    console.log(`Building ${sourcePath} -> ${outfile}`);
    const outPath = await buildOne({ sourcePath, outfile });
    console.log(`  -> ${outPath}`);
}

console.log("Build done.");
