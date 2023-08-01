autoload -Uz add-zsh-hook
function new_line_before_promopt() {
    # Print a newline before the prompt, unless it's the
    # first prompt in the process.
    if [ -z "$ZSH_THEME_NEW_LINE_BEFORE_PROMPT" ]; then
        ZSH_THEME_NEW_LINE_BEFORE_PROMPT=1
    elif [ "$ZSH_THEME_NEW_LINE_BEFORE_PROMPT" -eq 1 ]; then
        echo
    fi
}
add-zsh-hook precmd new_line_before_promopt

if [ "$TERM" = dumb ]; then
  unset zle_bracketed_paste
elif command -v starship &>/dev/null; then
  eval "$(starship init zsh)"
else
  # autoload colors; colors;
  setopt prompt_subst

  PROMPT_HOST=
  if [ -n "${SSH_TTY:-}" ]; then
    if [ -f ~/.hostname ]; then
      HOSTNAME=$(cat ~/.hostname)
    else
      HOSTNAME=$(hostname -f)
    fi
    PROMPT_HOST='%n@%F{yellow}$HOSTNAME%f:'
  fi
  PROMPT='%(?..%F{red}%?⏎
)%f# '"$PROMPT_HOST"'%F{blue}%(4~|%-1~/…/%2~|%~)%f
%(1j.%F{yellow}%%%j.)%f$ '
fi
