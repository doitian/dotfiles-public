# Pi (`pi`)

```sh
id=$(agent-berth new --wait pi --approve --model anthropic/claude-opus-4-5 \
  "Fix the failing test in src/parser.rs and run cargo test, then report the result with agent-berth reply.")
```

- Trailing arguments are initial messages; the session stays interactive.
  Never add `-p`/`--print`, which exits when done. Use `--` before a prompt
  that starts with a dash.
- Pi never asks before a tool call, so it has no auto-approval flag. It can
  ask once at startup whether to trust project-local resources (settings,
  extensions); `--approve` trusts them for this run and `--no-approve`
  ignores them, so neither leaves the pane on that prompt.
- `--model` takes `provider/id` or a pattern, optionally with a thinking
  level suffix (`sonnet:high`). `--provider <name>` narrows a bare id.

## Listing models

```sh
pi --list-models            # every available model
pi --list-models sonnet     # fuzzy search
```
