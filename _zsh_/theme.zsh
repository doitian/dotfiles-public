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
export LSCOLORS="Exfxcxdxbxegedabagacad"
# if [ "$OS_TYPE" = "Linux" -a -f "$HOME/.zsh/dircolors.256dark" ]; then
#   eval `dircolors $HOME/.zsh/dircolors.256dark`
# fi
setopt prompt_subst

function rbenv_prompt_info() {
  local ruby_version
  ruby_version=$(rbenv version 2> /dev/null) || return
  echo "‹$ruby_version" | sed 's/[ \t].*$/›/'
}
Function git_prompt_info() {
  local ref dirty
  ref=$(git symbolic-ref HEAD 2> /dev/null) || return
  dirty='%{[32m%}'
  #if [[ -n $(git status -s 2> /dev/null) ]]; then
  #  dirty='%{[1;31m%}'
  #fi
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

PROMPT='%{[47m%}%{[34m%}╭─%{[00m%}'"$PR_ROOT_INDICATOR"'%n%{[00m%}@'"$PR_SSH_INDICATOR"'%m%{[00m%} %{[33m%}%~ $(git_prompt_info) %{[1;34m%}$(rbenv_prompt_info)%(?..%{[31m%} %? ↵%{[00m%})%{[00m%}
%{[47m%}%{[34m%}╰─'"$PR_ROOT_INDICATOR"'➤%{[00m%} '
