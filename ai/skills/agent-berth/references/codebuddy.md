# CodeBuddy Code (`codebuddy`, alias `cbc`)

```sh
id=$(agent-berth new --wait codebuddy --permission-mode bypassPermissions --model glm-5.3 \
  "Fix the failing test in src/parser.rs and run cargo test, then report the result with agent-berth reply.")
```

- The trailing argument is the initial prompt; the session stays interactive.
  Never add `-p`/`--print`, which exits after one answer and closes the pane.
- `--permission-mode bypassPermissions` approves every tool call. The other
  modes are `default`, `acceptEdits`, `auto`, `dontAsk`, and `plan`;
  `acceptEdits` still asks before shell commands. `-y` skips permission
  prompts too, but HIGH and CRITICAL risk actions still ask.
- `--model` takes a model id.

## Listing models

The `--model` entry of `codebuddy --help` lists the supported ids:

```sh
codebuddy --help | grep -- '--model <model>'
```
