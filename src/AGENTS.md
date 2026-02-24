# Agents / automation

## Layout

- **Executable scripts** live in `src/*.js` and are the entrypoints listed in `package.json` `bin`. Each is built to `dist/<name>` by `bun run build`.
- **Non-executable shared code** lives in `src/lib/`. These are libraries used by the scripts; they are not run directly and are not listed in `bin`.

## Why `src/lib/`

Shared patterns were extracted from the CLI scripts so that:

1. **Single place for common behavior** – e.g. async `exists(path)`, `home()`, and `readStdin()` live in `src/lib/`. Scripts run subprocesses via Bun shell; see the **bun-shell-src** skill.
2. **Clear split** – anything in `src/` that is a `#!/usr/bin/env node` (or bun) entrypoint is an executable; anything in `src/lib/` is a dependency only.
3. **Credentials** – `src/lib/secrets.js` provides `getSecret()` using Bun Secrets (service name `ian-bin`). Scripts resolve API keys and tokens via env, then stored secrets, then TTY prompt.

## `src/lib/` modules

| File | Purpose |
|------|--------|
| `secrets.js` | `getSecret(name, ...envVars)` – credentials via env, Bun Secrets, or TTY prompt (service `ian-bin`). |
| `openai.js` | `getOpenAIClient()`, `streamCompletion()`, `runOneshot()` – oneshot streaming (optional system + user input). |
| `env.js` | `home()` – user home dir (USERPROFILE / HOME). |
| `io.js` | `readStdin()` – read all stdin (TTY or pipe). |
| `fs.js` | `exists(path)` – async “path exists?”. |
| `pushover.js` | `send(extraForm, credentials)` – send a message via Pushover API (caller supplies user key and app token). |

## Conventions

- **Shell commands** – Follow the `bun-shell-src` skill.
- **Files in `src/lib/`** must not depend on generated or build-time-injected files.
- Prefer **async APIs** in both scripts and lib.
- New shared, non-executable helpers belong in `src/lib/` (and optionally new files there if they grow).
- Executables stay in `src/<name>.js` and import from `./lib/...` as needed.

## JavaScript Formatting

- Use 4-space indentation
- Format file using `biome format --write <file>`
