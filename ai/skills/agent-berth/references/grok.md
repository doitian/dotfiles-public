# Grok (`grok`)

```sh
id=$(agent-berth new --wait grok --always-approve --model grok-4.7 \
  "Fix the failing test in src/parser.rs and run cargo test, then report the result with agent-berth reply.")
```

- The trailing argument is the initial prompt; the session stays interactive.
  Never use `-p`/`--single` or `grok agent`, which exit when done.
- `--always-approve` approves every tool call. For finer control use
  `--permission-mode` (`default`, `acceptEdits`, `auto`, `dontAsk`,
  `bypassPermissions`, `plan`); `acceptEdits` still asks before shell
  commands.
- `-m`/`--model` takes a model id.
- Grok reports only after the prompt is submitted, so always pass one when
  using `--wait`.

## Listing models

```sh
grok models
```

It prints the signed-in account's models and marks the default.
