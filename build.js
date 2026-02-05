#!/usr/bin/env bun
/**
 * Compile each bin entrypoint to a standalone executable in dist/.
 * Run: bun run build
 */
import { readFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
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
    ["AGENT_PUSHOVER_USER_KEY", "AGENT_PUSHOVER_USER_KEY"],
    ["AGENT_PUSHOVER_APP_TOKEN", "AGENT_PUSHOVER_APP_TOKEN"],
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

for (const { name, sourcePath, configSource } of entries) {
    const outfile = `${distDir}/${name}`;
    console.log(`Building ${sourcePath} -> ${outfile}`);
    const outPath = await buildOne({ sourcePath, outfile, configSource });
    console.log(`  -> ${outPath}`);
}

console.log("Build done.");
