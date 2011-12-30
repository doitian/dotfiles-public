autoload colors; colors;
export LSCOLORS="Gxfxcxdxbxegedabagacad"
if [ "$OS_TYPE" = "Linux" -a -f "$HOME/.zsh/dircolors.256dark" ]; then
  eval `dircolors $HOME/.zsh/dircolors.256dark`
fi
setopt prompt_subst

function rbenv_prompt_info() {
  local ruby_version
  ruby_version=$(rbenv version 2> /dev/null) || return
  echo "‹$ruby_version" | sed 's/[ \t].*$/›/'
}
Function git_prompt_info() {
  local ref dirty
  ref=$(git symbolic-ref HEAD 2> /dev/null) || return
  dirty='%{[1;32m%}'
  if [[ -n $(git status -s 2> /dev/null) ]]; then
    dirty='%{[1;31m%}'
  fi
  echo "${dirty}(${ref#refs/heads/})"
}
function git_prompt_dirty() {
  if [[ -n $(git status -s 2> /dev/null) ]]; then
  else
    echo 
  fi
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
if [[ $UID -eq 0 ]]; then
  PR_ROOT_INDICATOR='%{[1;31m%}'
fi

local PR_SSH_INDICATOR=
if [[ -n "$SSH_CLIENT"  ||  -n "$SSH2_CLIENT" ]]; then
  PR_SSH_INDICATOR='%{[1;33m%}'
fi

PROMPT='%{[47m%}%{[1;30m%}╭─%{[00m%}'"$PR_ROOT_INDICATOR"'%n%{[00m%}@'"$PR_SSH_INDICATOR"'%m%{[00m%} %{[1;33m%}%~ $(git_prompt_info) %{[1;34m%}$(rbenv_prompt_info)%(?..%{[1;31m%} %? ↵%{[00m%})%{[00m%}
%{[47m%}%{[1;30m%}╰─'"$PR_ROOT_INDICATOR"'➤%{[00m%} '
