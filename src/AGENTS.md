# Agents / automation

## Layout

- **Executable scripts** live in `src/*.js` and are the entrypoints listed in `package.json` `bin`. Each is built to `dist/<name>` by `bun run build`.
- **Non-executable shared code** lives in `src/lib/`. These are libraries used by the scripts; they are not run directly and are not listed in `bin`.

## Why `src/lib/`

Shared patterns were extracted from the CLI scripts so that:

1. **Single place for common behavior** – e.g. async `exists(path)`, `home()`, and subprocess helpers (`run`, `runCapture`, `runWithStdin`, `runInherit`) live in `src/lib/` and are reused instead of duplicated.
2. **Clear split** – anything in `src/` that is a `#!/usr/bin/env node` (or bun) entrypoint is an executable; anything in `src/lib/` is a dependency only.
3. **Config in one place** – `src/lib/config.js` holds build-time defaults (e.g. OpenAI env). The build can override this file when compiling binaries so secrets stay out of the repo.

## `src/lib/` modules

| File | Purpose |
|------|--------|
| `config.js` | Defaults for API keys/URLs (overridden at build time for bin builds). |
| `openai.js` | `getOpenAIClient()`, `streamCompletion()`, `runOneshot()` – oneshot streaming (optional system + user input). |
| `env.js` | `home()` – user home dir (USERPROFILE / HOME). |
| `io.js` | `readStdin()` – read all stdin (TTY or pipe). |
| `fs.js` | `exists(path)` – async “path exists?”. |
| `run.js` | Async subprocess helpers: `run`, `runInherit`, `runCapture`, `runWithStdin`. |

## Conventions

- **Files in `src/lib/`** must not import `src/lib/config.js`.
- Prefer **async APIs** in both scripts and lib.
- New shared, non-executable helpers belong in `src/lib/` (and optionally new files there if they grow).
- Executables stay in `src/<name>.js` and import from `./lib/...` as needed.

## JavaScript Formatting

- Use 4-space indentation
