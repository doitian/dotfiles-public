# Agents / automation

## Layout

- **Executable scripts** live in `src/*.js`; `bun run build` compiles each to `dist/<name>` (plus `src/mise-tasks/` → `dist/mise-tasks/`, and `src/niri-scripts/` → `dist/` on Linux only).
- **Non-executable shared code** lives in `src/lib/`. These are libraries used by the scripts; they are not run directly and are not listed in `bin`.

## Why `src/lib/`

Shared patterns were extracted from the CLI scripts so that:

1. **Single place for common behavior** – e.g. async `exists(path)`, `home()`, and `readStdin()` live in `src/lib/`. Scripts run subprocesses via Bun shell; see the **bun-shell-src** skill.
2. **Clear split** – anything in `src/` that is a `#!/usr/bin/env node` (or bun) entrypoint is an executable; anything in `src/lib/` is a dependency only.
3. **Credentials** – `src/lib/secrets.js` provides `getSecret()` using Bun Secrets (service name `ian-bin`). Scripts resolve API keys and tokens via env, then stored secrets, then TTY prompt.

## Conventions

- **Shell commands** – Follow the `bun-shell-src` skill.
- **Files in `src/lib/`** must not depend on generated or build-time-injected files.
- Prefer **async APIs** in both scripts and lib.
- New shared, non-executable helpers belong in `src/lib/` (and optionally new files there if they grow).
- Executables stay in `src/<name>.js` and import from `./lib/...` as needed.

## JavaScript Formatting

- Use 2-space indentation (per `default/.editorconfig`, which sets `indent_size = 2` for all files)
- Format file using `vtsls-fmt <file>`
