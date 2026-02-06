---
name: bun-shell-src
description: Use Bun's shell API ($ from "bun") when writing or editing scripts that run shell commands in src/. Use when adding or changing subprocess/shell usage under src/, or when the user asks for shell execution in this project. Prefer Bun Shell over child_process or execSync.
---

# Bun Shell in src/

When writing or editing scripts in **src/** (and subdirs like **src/mise-tasks/**), use [Bun Shell](https://bun.com/docs/runtime/shell) for running shell commands. Scripts in this repo are run with Bun (`#!/usr/bin/env bun`).

## Quick rules

- **Import**: `import { $ } from "bun";`
- **Execute**: template literals: `` await $`cmd arg ${var}` `` (interpolated values are escaped by default).
- **Array in template**: An array literal inside `${}` is not allowed. Use a variable: `const args = [...]; await $`cmd ${args}`.
- **Optional/failing commands**: chain `.nothrow()` and check `result.exitCode` (and optionally `result.stdout` / `result.stderr`).
- **Capture output**: `.text()` for string, or `.quiet()` and use `result.stdout` / `result.stderr` (Buffers).
- **No stdout to terminal**: `.quiet()`.

## Patterns used in this repo

**Required command (throws on non-zero exit):**
```js
await $`scoop update -a`;
```

**Optional command, check exit code:**
```js
const r = await $`scoop --version`.quiet().nothrow();
if (r.exitCode === 0) { /* use r.stdout */ }
```

**Capture text or fail:**
```js
const r = await $`gh api ...`.quiet().nothrow();
if (r.exitCode !== 0) throw new Error(`gh failed: ${r.stderr?.toString() ?? ""}`);
const out = (r.stdout?.toString() ?? "").trim();
```

**Helper for “command exists”:**
```js
async function hasCommand(cmd, args = []) {
  const r = await $`${cmd} ${args}`.quiet().nothrow().catch(() => ({ exitCode: 1 }));
  return r.exitCode === 0;
}
```

## API summary

| Need | Use |
|------|-----|
| Run, throw on non-zero | `await $`cmd`` |
| Run, don’t throw | `.nothrow()` then check `exitCode` |
| Hide stdout/stderr | `.quiet()` |
| Get stdout as string | `.text()` (implies quiet) or `(await $`...`.quiet()).stdout.toString()` |
| Working directory | `.cwd(path)` |
| Env for one command | `.env({ ...process.env, FOO: "bar" })` |

## Security

- Interpolated variables are treated as single arguments (no shell injection from `${var}`).
- Do not pass user input through a separate shell (e.g. `bash -c "${input}"`); sanitize or avoid.

## Reference

Full docs: https://bun.com/docs/runtime/shell (redirection, pipes, env, globals like `$.nothrow()`, `$.cwd()`).
