# Claude Code (`claude`)

```sh
id=$(agent-berth new --wait claude --permission-mode bypassPermissions --model opus \
  "Fix the failing test in src/parser.rs and run cargo test, then report the result with agent-berth reply.")
```

- The trailing argument is the initial prompt; the session stays interactive.
  Never add `-p`/`--print`, which exits after one answer and closes the pane.
- `--permission-mode bypassPermissions` approves every tool call. Milder
  modes: `auto` lets a classifier approve or deny each call, and
  `acceptEdits` approves file edits but still asks before shell commands, so
  the delegate can stop as `waiting`. The first bypass run on a machine may
  show a one-time confirmation; answer it with `agent-berth attach "$id"`.
- `--model` takes an alias for the latest model of a family (`fable`, `opus`,
  `sonnet`, `haiku`) or a full model id such as `claude-opus-5-5`.

## Listing models

There is no listing command. Use one of the aliases above, or a full id from
the Claude models overview; `/model` inside a session opens the picker.
