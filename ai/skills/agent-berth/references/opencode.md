# OpenCode (`opencode`)

```sh
id=$(agent-berth new --wait env 'OPENCODE_CONFIG_CONTENT={"model":"alibaba-cn/glm-5.3"}' \
  opencode --standalone --auto \
  --prompt "Fix the failing test in src/parser.rs and run cargo test, then report the result with agent-berth reply.")
```

- `--prompt` gives the initial prompt; a positional argument is the directory
  to open, not a prompt. Never use `opencode run`, which exits when done.
- `--auto` approves every permission that the config does not explicitly
  deny.
- The interactive TUI has no `--model` flag, so the model goes in
  `OPENCODE_CONFIG_CONTENT`, which holds inline config JSON; `"model"`
  takes `provider/model`.
- `--standalone` runs a private server for this pane. Without it the TUI
  joins the shared background service, which ignores the variable and keeps
  its own default model. Whether agent-berth tracks a `--standalone` session
  has not been verified; if `--wait` times out, drop the model override.
- `agent-berth new` does not forward the caller's environment, hence the
  `env` prefix; the tmux window is then named `env`.

## Listing models

```sh
opencode models
```

It prints one `provider/model` per line.
