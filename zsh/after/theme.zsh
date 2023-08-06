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

# Default coloring for BSD-based ls
export LSCOLORS="Gxfxcxdxbxegedabagacad"

# Default coloring for GNU-based ls
if [[ -z "$LS_COLORS" ]]; then
  # Define LS_COLORS via dircolors if available. Otherwise, set a default
  # equivalent to LSCOLORS (generated via https://geoff.greer.fm/lscolors)
  if (( $+commands[dircolors] )); then
    [[ -f "$HOME/.dircolors" ]] \
      && source <(dircolors -b "$HOME/.dircolors") \
      || source <(dircolors -b)
  else
    export LS_COLORS="di=1;36:ln=35:so=32:pi=33:ex=31:bd=34;46:cd=34;43:su=30;41:sg=30;46:tw=30;42:ow=30;43"
  fi
fi

if [ "$TERM" = dumb ]; then
  unset zle_bracketed_paste
elif (( $+commands[starship] )); then
  eval "$(starship init zsh)"
else
  PROMPT_HOST=
  if [ -n "${SSH_TTY:-}" ]; then
    PROMPT_HOST="%n@%F{yellow}$SHORT_HOST%f:"
  fi
  PROMPT="%(?..%F{red}%?⏎
)%f# $PROMPT_HOST%F{blue}%(4~|%-1~/…/%2~|%~)%f
%(1j.%F{yellow}%%%j.)%f$ "
fi
