#!/usr/bin/env bun

async function main() {
    const args = process.argv.slice(2);
    const separator = args.indexOf("--");
    const modelIndex = args.findIndex(
        (arg, index) => arg === "-m" && (separator === -1 || index < separator),
    );
    const filter = modelIndex === -1 ? [] : [args[modelIndex + 1]];
    if (modelIndex !== -1 && (!filter[0] || filter[0].startsWith("-"))) {
        console.error("foc: -m requires a model filter");
        process.exit(1);
    }

    const models = Bun.spawn(["opencode", "models", ...filter], {
        stdin: "ignore",
        stdout: "pipe",
        stderr: "inherit",
    });
    const output = await new Response(models.stdout).text();
    const modelsCode = await models.exited;
    if (modelsCode !== 0) process.exit(modelsCode);

    const fzf = Bun.spawn(["fzf", "--no-multi"], {
        stdin: new Blob([output]),
        stdout: "pipe",
        stderr: "inherit",
    });
    const selected = (await new Response(fzf.stdout).text()).trim();
    const code = await fzf.exited;
    if (code !== 0) process.exit(code);
    if (!selected) process.exit(1);

    if (modelIndex === -1) {
        args.unshift("-m", selected);
    } else {
        args[modelIndex + 1] = selected;
    }

    const opencode = Bun.spawn(["opencode", ...args], {
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });
    process.exit(await opencode.exited);
}

main().catch((error) => {
    console.error(`foc: ${error.message}`);
    process.exit(1);
});
