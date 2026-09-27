#!/usr/bin/env bun
import { findModelOption } from "./lib/model-option.js";

function fail(message) {
    console.error(`fpi: ${message}`);
    process.exit(1);
}

async function main() {
    const args = process.argv.slice(2);
    const separator = args.indexOf("--");
    const option = findModelOption(args, separator);
    if (option && (!option.value || option.value.startsWith("-"))) {
        fail(`${option.flag} requires a model filter`);
    }
    const filter = option ? [option.value] : [];

    const models = Bun.spawn(["pi", "--list-models", ...filter], {
        stdin: "ignore",
        stdout: "pipe",
        stderr: "inherit",
    });
    const output = await new Response(models.stdout).text();
    const modelsCode = await models.exited;
    if (modelsCode !== 0) process.exit(modelsCode);

    const fzf = Bun.spawn(["fzf", "--no-multi", "--header-lines=1"], {
        stdin: new Blob([output]),
        stdout: "pipe",
        stderr: "inherit",
    });
    const selected = (await new Response(fzf.stdout).text()).trim();
    const code = await fzf.exited;
    if (code !== 0) process.exit(code);
    if (!selected) process.exit(1);

    const [provider, name] = selected.split(/\s+/);
    const model = `${provider}/${name}`;

    const rest = option
        ? args.slice(0, option.index).concat(args.slice(option.index + option.span))
        : args.slice();
    rest.splice(option ? option.index : 0, 0, "--model", model);

    const pi = Bun.spawn(["pi", ...rest], {
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });
    process.exit(await pi.exited);
}

main().catch((error) => {
    console.error(`fpi: ${error.message}`);
    process.exit(1);
});
