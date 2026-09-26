#!/usr/bin/env bun

function fail(message) {
    console.error(`foc: ${message}`);
    process.exit(1);
}

function findModelOption(args, separator) {
    const limit = separator === -1 ? args.length : separator;
    for (let index = 0; index < limit; index++) {
        const arg = args[index];
        if (arg.startsWith("--model=")) {
            return { index, span: 1, flag: "--model", value: arg.slice("--model=".length) };
        }
        if (arg === "-m" || arg === "--model") {
            return { index, span: 2, flag: arg, value: args[index + 1] };
        }
    }
    return null;
}

async function main() {
    const args = process.argv.slice(2);
    const separator = args.indexOf("--");
    const option = findModelOption(args, separator);
    if (option && (!option.value || option.value.startsWith("-"))) {
        fail(`${option.flag} requires a model filter`);
    }
    const filter = option ? option.value.toLowerCase() : "";

    const models = Bun.spawn(["opencode", "models"], {
        stdin: "ignore",
        stdout: "pipe",
        stderr: "inherit",
    });
    const output = await new Response(models.stdout).text();
    const modelsCode = await models.exited;
    if (modelsCode !== 0) process.exit(modelsCode);

    const matches = output
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && line.toLowerCase().includes(filter));
    if (matches.length === 0) fail(option ? `no models match "${option.value}"` : "no models found");

    const fzf = Bun.spawn(["fzf", "--no-multi"], {
        stdin: new Blob([matches.join("\n")]),
        stdout: "pipe",
        stderr: "inherit",
    });
    const selected = (await new Response(fzf.stdout).text()).trim();
    const code = await fzf.exited;
    if (code !== 0) process.exit(code);
    if (!selected) process.exit(1);

    const rest = option
        ? args.slice(0, option.index).concat(args.slice(option.index + option.span))
        : args.slice();
    if (rest[0] === "--") rest.shift();

    const env = { ...process.env };
    if (rest[0] === "run" || rest[0] === "mini") {
        rest.splice(1, 0, "--model", selected);
    } else {
        // The TUI has no model flag; an inline config model becomes the default,
        // but only a private server reads it, so force --standalone.
        let inline = {};
        if (env.OPENCODE_CONFIG_CONTENT) {
            try {
                inline = JSON.parse(env.OPENCODE_CONFIG_CONTENT);
            } catch {
                fail("OPENCODE_CONFIG_CONTENT is not valid JSON");
            }
        }
        env.OPENCODE_CONFIG_CONTENT = JSON.stringify({ ...inline, model: selected });
        const connects = (flag) =>
            rest.includes(flag) || rest.some((arg) => arg.startsWith(`${flag}=`));
        if (!rest.includes("--standalone") && !connects("--server")) {
            rest.unshift("--standalone");
        }
        if (connects("--server")) {
            console.error("foc: note: a shared server keeps its configured model");
        }
        if (connects("--continue") || connects("--session") || rest.includes("-c") || rest.includes("-s")) {
            console.error("foc: note: a continued session keeps its current model");
        }
    }

    const opencode = Bun.spawn(["opencode", ...rest], {
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
        env,
    });
    process.exit(await opencode.exited);
}

main().catch((error) => {
    console.error(`foc: ${error.message}`);
    process.exit(1);
});
