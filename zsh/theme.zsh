if [ "$TERM" = dumb ]; then
  unset zle_bracketed_paste
elif command -v starship &> /dev/null; then
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
  ZSH_THEME_ENABLE_ASDF=
  if ! which asdf &> /dev/null; then
    ZSH_THEME_ENABLE_ASDF=
  fi
  function universe_env_info() {
    local asdf_info
    local virtualenv_info
    if [ -n "$ZSH_THEME_ENABLE_ASDF" ]; then
      asdf current 2>&1 | grep -v -F "set by $HOME/.tool-versions" | sed -n 's/\s*(set by.*//p' | while read asdf_info; do
        echo -n " %F{cyan}${asdf_info%% *}»%f${asdf_info##* }"
      done
    fi
    if [ -n "$VIRTUAL_ENV" ]; then
      name="${VIRTUAL_ENV%/py2env}"
      name="${name%/py3env}"
      name="${name%/.venv}"
      if [ -n "$PIPENV_ACTIVE" ]; then
        name="${name%-*}"
        echo -n " %F{cyan}penv»%f$(basename "$name")"
      fi
    elif [ -n "$CONDA_DEFAULT_ENV" ]; then
      echo -n " %F{cyan}penv»%f$(CONDA_DEFAULT_ENV)"
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
)%f
# '"$PROMPT_HOST"'%F{blue}%(4~|%-1~/…/%2~|%~)%f$(git_prompt_info)$(universe_env_info)
%(1j.%F{yellow}%%%j.)%f$ '
fi
