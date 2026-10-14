# Kitty auto-loads its zsh integration only in shells it spawns directly, not
# inside tmux. Load it manually for OSC 133 prompt/command marks, keeping only
# prompt-mark and disabling the parts that fight Starship and omz.termsupport.
# Starship emits no OSC 133 marks and the helper guards against double init.
if [[ -n "$TMUX" && -r /usr/lib/kitty/shell-integration/zsh/kitty-integration ]]; then
  export KITTY_SHELL_INTEGRATION="no-cursor no-title no-cwd no-complete no-sudo"
  autoload -Uz -- /usr/lib/kitty/shell-integration/zsh/kitty-integration
  kitty-integration
  unfunction kitty-integration
fi
