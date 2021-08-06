if [ "$TERM" = dumb ]; then
  unset zle_bracketed_paste
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

      echo " %F{$fg}±$info"
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
# '"$PROMPT_HOST"'%F{blue}%(4~|%-1~/…/%2~|%~)%f$(git_prompt_info)
%(1j.%F{yellow}%%%j.)%f$ '
fi
