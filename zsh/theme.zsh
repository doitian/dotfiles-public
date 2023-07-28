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

  ZSH_THEME_GIT_PROMPT_DIRTY="*"
  ZSH_THEME_GIT_PROMPT_CLEAN=""
  GIT_PS1_SHOWUPSTREAM="auto"

  function git_prompt_info() {
    local info="$(__git_ps1 "%s")"
    if [ -n "$info" ]; then
      local dirty="$(parse_git_dirty)"
      local fg=green
      if [ -n "$dirty" ]; then
        fg=red
      fi

      echo " %F{$fg}±\e[3m$info\e[23m"
    fi
  }

  export VIRTUAL_ENV_DISABLE_PROMPT=true
  function universe_env_info() {
    if [ -n "$VIRTUAL_ENV" ]; then
      echo -n " %F{cyan}penv»%f${{VIRTUAL_ENV%/.venv}##*/}"
    elif [ -n "$CONDA_DEFAULT_ENV" ]; then
      echo -n " %F{cyan}conda»%f${CONDA_DEFAULT_ENV}"
    fi
  }

  PROMPT_HOST=
  if [ -n "$SSH_CONNECTION" ]; then
    if [ -f ~/.hostname ]; then
      HOSTNAME=$(cat ~/.hostname)
    else
      HOSTNAME=$(hostname -f)
    fi
    PROMPT_HOST='%n@%F{yellow}$HOSTNAME%f:'
  fi
  PROMPT='%(?..%F{red}%?⏎
)%f# '"$PROMPT_HOST"'%F{blue}%(4~|%-1~/…/%2~|%~)%f$(git_prompt_info)$(universe_env_info)
%(1j.%F{yellow}%%%j.)%f$ '
fi
