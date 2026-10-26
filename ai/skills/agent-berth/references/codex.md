# Codex (`codex`)

```sh
id=$(agent-berth new --wait codex --approve-for-me --model gpt-5.6-terra \
  "Fix the failing test in src/parser.rs and run cargo test, then report the result with agent-berth reply.")
```

- The trailing argument is the initial prompt; the session stays interactive.
  Never use `codex exec`, which exits when done and closes the pane.
- `--approve-for-me` keeps the `workspace-write` sandbox and sends each
  approval request to an automatic reviewer instead of the user.
  `--dangerously-bypass-approvals-and-sandbox` skips approvals and the
  sandbox entirely; use it only inside an external sandbox.
- `-m`/`--model` takes a model slug. Set reasoning effort with
  `-c model_reasoning_effort="high"`.
- Codex reports only after the prompt is submitted, so always pass one when
  using `--wait`.

## Listing models

```sh
codex debug models | jq -r '.models[].slug'
```

Each entry's `supported_reasoning_levels` lists the efforts it accepts.
