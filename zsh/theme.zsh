if [ "$TERM" = dumb ]; then
  unset zle_bracketed_paste
  return 0
fi

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

    echo " %F{$fg}ᚬ$info"
  fi
}

export VIRTUAL_ENV_DISABLE_PROMPT=true
ZSH_THEME_ENABLE_RBENV=true
if ! which rbenv &> /dev/null; then
  ZSH_THEME_ENABLE_RBENV=
fi
function universe_env_info() {
  local rbenv_info virtualenv_info
  if [ -n "$ZSH_THEME_ENABLE_RBENV" ]; then
    rbenv_info="$(rbenv version)"
    if ! [ "${rbenv_info#*set by }" = "$HOME/.rbenv/version)" ]; then
      echo -n " %F{cyan}rb»%f${rbenv_info%% *}"
    fi
  fi
  if [ -n "$VIRTUAL_ENV" ]; then
    name="${VIRTUAL_ENV%/py2env}"
    name="${name%/py3env}"
    if [ -n "$PIPENV_ACTIVE" ]; then
      name="${name%-*}"
    fi
    echo -n " %F{cyan}py»%f$(basename "$name")"
  fi
}

PROMPT_HOST=
if [ -n "$SSH_CONNECTION" ]; then
  HOSTNAME=$(hostname -f)
  PROMPT_HOST='%F{yellow}%n@$HOSTNAME%f:'
fi
PROMPT='%(?..%F{red}%?⏎
)%f
# '"$PROMPT_HOST"'%F{blue}%(4~|%-1~/…/%2~|%~)%f$(git_prompt_info)$(universe_env_info)
%(1j.%F{yellow}%%%j.)%f$ '
