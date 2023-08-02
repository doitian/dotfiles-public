# -*- sh -*-
##################################################
# Editor
__VIM_PROGRAM__="${__VIM_PROGRAM__:-vim}"
if [ "$__VIM_PROGRAM__" != vim ]; then
  alias vim="$__VIM_PROGRAM__"
fi
alias vi="$__VIM_PROGRAM__"
alias :e="$__VIM_PROGRAM__"
alias view="$__VIM_PROGRAM__ -R"
alias viper="$__VIM_PROGRAM__ +Viper"

##################################################
# TMUX
alias t="tmux"
alias tl="tmux ls"
alias tnw="tmux neww"
alias tns="tmux new -s"
alias ta="tmux-fzf-session"
alias tj="tmux-fzf-pane -s -p"
alias tk="tmux-fzf-pane -a -p"
alias tu=tmux-up

##################################################
# Git
alias g="git"
alias gst="git status"
alias gf="git flow"
alias gff="git flow feature"
alias gfb="git flow bugfix"
alias gfr="git flow release"
alias gfh="git flow hotfix"
alias gfs="git flow support"
alias lg="lazygit"

##################################################
# File
alias rm="rm -i"
alias mv="mv -i"
alias cp="cp -i"
alias cpv="rsync -poghb --backup-dir=/tmp/rsync -e /dev/null --progress --"
alias ff="fzf-finder"
alias di='dirs -v | head -n 10'

##################################################
# System
alias psg="ps auxw | grep -i"
if command -v tsp &>/dev/null; then
  alias ts="tsp"
fi

##################################################
# Utilities
alias rg.="rg --hidden"
alias fd.="fd --hidden"
alias ping="ping -c 5"
alias more="less"
alias ltail="less +F -R"
alias lr="less -R"

alias rsync-copy="rsync -av --progress -h"
alias rsync-move="rsync -av --progress -h --remove-source-files"
alias rsync-update="rsync -avu --progress -h"
alias rsync-synchronize="rsync -avu --delete --progress -h"
alias rsync-diff="rsync -nav --delete"

if command -v colordiff &>/dev/null; then
  alias diff=colordiff
fi
if command -v prettyping &>/dev/null; then
  alias ping=prettyping
fi

alias mk=make

alias fg=' fg'
alias gfw='gfw '
alias sudo='sudo '

##################################################
# Dir Aliases
cb="$HOME/codebase"
brain="$HOME/Dropbox/Brain"
dl="$HOME/Downloads"
dotfiles="$HOME/.dotfiles"
