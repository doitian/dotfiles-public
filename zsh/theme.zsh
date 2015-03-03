if [ "$TERM" = dumb ]; then
  return 0
fi

autoload colors; colors;

#1.   directory
#2.   symbolic link
#3.   socket
#4.   pipe
#5.   executable
#6.   block special
#7.   character special
#8.   executable with setuid bit set
#9.   executable with setgid bit set
#10.  directory writable to others, with sticky bit
#11.  directory writable to others, without sticky bit

#a     black
#b     red
#c     green
#d     brown
#e     blue
#f     magenta
#g     cyan
#h     light grey
#                1 2 3 4 5 6 7 8 9 0 1
# if [ "$OS_TYPE" = "Linux" -o "$OS_TYPE" = "CYGWIN_NT-5.1" ] && [ -f "$HOME/.dotfiles/zsh/dircolors.256dark" ]; then
#   eval `dircolors $HOME/.dotfiles/zsh/dircolors.256dark`
# fi
setopt prompt_subst

if [ -f "$ZSH/plugins/gitfast/git-prompt.sh" ]; then
  source "$ZSH/plugins/gitfast/git-prompt.sh"
  GIT_PS1_SHOWUPSTREAM="auto"
else
  function __git_ps1_show_upstream () {}
fi

function dev_env_prompt_info() {
  rbenv_prompt_info
}

function rbenv_prompt_info() {
  local ruby_version gemset
  ruby_version=$(rbenv version-name 2> /dev/null) || return
  gemset=$(rbenv gemset active 2> /dev/null | awk '{print $1}')
  if [ -n "$gemset" ]; then
    gemset="%{[0;34m%}|%{[1;31m%}$gemset%{[0m%}"
  fi

  echo "‹$ruby_version$gemset›"
}

function __git_minutes_since_last_commit {
  local now=`date +%s`
  local last_commit=`git log --pretty=format:'%at' -1 2> /dev/null`
  if [ -z "$last_commit" ]; then
    m="%{[1;31m%}*"
    return
  fi
  local seconds_since_last_commit=$((now-last_commit))
  local minutes_since_last_commit=$((seconds_since_last_commit/60))
  local readable_time
  if ((minutes_since_last_commit < 60)); then
    readable_time="${minutes_since_last_commit}m"
  elif ((minutes_since_last_commit < 1440)); then
    readable_time="$((minutes_since_last_commit/60))h"
  else
    readable_time="$((minutes_since_last_commit/1440))d"
  fi

  if ((minutes_since_last_commit < 30)); then
    m="%{[32m%}${readable_time}"
  elif ((minutes_since_last_commit < 120)); then
    m="%{[33m%}${readable_time}"
  else
    m="%{[31m%}${readable_time}"
  fi
}

function git_prompt_info() {
  local ref dirty
  ref=$(git symbolic-ref HEAD 2> /dev/null) || return
  dirty='%{[32m%}'
  if [[ -n $(git status -s 2> /dev/null) ]]; then
    dirty='%{[31m%}'
  fi

  local p=""
  local m=""
  __git_ps1_show_upstream
  if [ -n "$p" ] && [ "$p" != "=" ]; then
    p="%{[1;31m%}${p}"
  fi
  __git_minutes_since_last_commit

  echo "%{[34m%}(${m}%{[0;34m%}|${dirty}${ref#refs/heads/}${p}%{[00m%}%{[34m%})"
}

# reset 00
# black 30
# red 31 bright 1;31 background 41
# green 32
# yellow 33
# blue 34
# magenta 35
# cyan 36
# white 37
# Check the UID

local PR_ROOT_INDICATOR=
local PR_ROOT_PROMPT='$'
if [[ $UID -eq 0 ]]; then
  PR_ROOT_INDICATOR='%{[1;31m%}'
  PR_ROOT_PROMPT='#'
fi

local PR_SSH_INDICATOR=
if [[ -n "$SSH_CLIENT"  ||  -n "$SSH2_CLIENT" ]]; then
  PR_SSH_INDICATOR='%{[33m%}'
fi

PROMPT='%{[34m%}╭─%{[00m%} '"$PR_ROOT_INDICATOR"'%n%{[00m%}@'"$PR_SSH_INDICATOR"'%m%{[00m%} %{[1;34m%}%~ %{[00m%}$(git_prompt_info) %{[33m%}$(dev_env_prompt_info)%(?..%{[31m%} %? ↵%{[00m%})%{[00m%}
%{[34m%}╰'"$PR_ROOT_INDICATOR"'%(1j.[%j].)'"$PR_ROOT_PROMPT"'%{[00m%} '
