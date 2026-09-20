#!/usr/bin/env bun

async function main() {
    const args = process.argv.slice(2);
    const separator = args.indexOf("--");
    const modelIndex = args.findIndex(
        (arg, index) => arg === "--model" && (separator === -1 || index < separator),
    );
    const filter = modelIndex === -1 ? [] : [args[modelIndex + 1]];
    if (modelIndex !== -1 && (!filter[0] || filter[0].startsWith("-"))) {
        console.error("fpi: --model requires a model filter");
        process.exit(1);
    }

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

    if (modelIndex === -1) {
        args.unshift("--model", model);
    } else {
        args[modelIndex + 1] = model;
    }

    const pi = Bun.spawn(["pi", ...args], {
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
