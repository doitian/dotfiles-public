# -*- sh -*-
##################################################
# Editor
alias vi='vim'
alias :e=vim
function tv() {
  tmux neww "vim $*"
}
alias view='vim -R'
alias viper='vim +Viper'

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

##################################################
# Utilities
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

alias ssh="TERM=xterm-256color ssh"

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
