# If not running interactively, don't do anything
case $- in
*i*) ;;
*) return ;;
esac

# don't put duplicate lines or lines starting with space in the history.
# See bash(1) for more options
HISTCONTROL=ignoreboth

# append to the history file, don't overwrite it
shopt -s histappend

# for setting history length see HISTSIZE and HISTFILESIZE in bash(1)
HISTSIZE=1000
HISTFILESIZE=2000

# check the window size after each command and, if necessary,
# update the values of LINES and COLUMNS.
shopt -s checkwinsize

# If set, the pattern "**" used in a pathname expansion context will
# match all files and zero or more directories and subdirectories.
if ((${BASH_VERSION%%.*} > 3)); then
  shopt -s globstar
fi

# make less more friendly for non-text input files, see lesspipe(1)
[ -x /usr/bin/lesspipe ] && eval "$(SHELL=/bin/sh lesspipe)"

PS1='\w\$ '

# If this is an xterm set the title to user@host:dir
case "$TERM" in
xterm* | rxvt*)
  PS1="\[\e]0;\h:\w\a\]$PS1"
  ;;
*) ;;
esac

# Default coloring for BSD-based ls
export LSCOLORS="Gxfxcxdxbxegedabagacad"

# Default coloring for GNU-based ls
if [[ -z "$LS_COLORS" ]]; then
  # Define LS_COLORS via dircolors if available. Otherwise, set a default
  # equivalent to LSCOLORS (generated via https://geoff.greer.fm/lscolors)
  if command -v dircolors &>/dev/null; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
  else
    export LS_COLORS="di=1;36:ln=35:so=32:pi=33:ex=31:bd=34;46:cd=34;43:su=30;41:sg=30;46:tw=30;42:ow=30;43"
  fi
fi

# enable programmable completion features (you don't need to enable
# this, if it's already enabled in /etc/bash.bashrc and /etc/profile
# sources /etc/bash.bashrc).
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi

# disable the message that bash is not the default shell
export BASH_SILENCE_DEPRECATION_WARNING=1

function newline_precmd() {
  if [ -z "$BASH_THEME_NEW_LINE_BEFORE_PROMPT" ]; then
    BASH_THEME_NEW_LINE_BEFORE_PROMPT=1
  else
    echo
  fi
}
starship_precmd_user_func="newline_precmd"
