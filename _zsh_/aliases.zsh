# -*- sh -*-
OS_TYPE=`uname -s`

##################################################
# Editor
alias e="emacs-dwim"
alias g="git"
alias f="file-picker"
alias vi='vim'

##################################################
# Command Edit
alias h=history
alias hl="history"
alias hr="history -n"
alias :q="exit"

##################################################
# TMUX
alias ts=tmux-new-or-attach
alias t="tmux"
alias tl="tmux ls"
alias tn="tmux neww"
alias tss="tmuxinator start"

##################################################
# Yaourt
alias y="yaourt"
alias yy="yaourt -S"
alias ys="yaourt -Ss"
alias yl="yaourt -Ql"
alias yi="yaourt -Qi"
alias yo="yaourt -Qo"
alias yu="yaourt -Syu --aur"
alias yc="yaourt -Sc"
alias yD="yaourt -Qdt"
alias yd="yaourt -Rcs"

##################################################
# File & Direcotry
if [ "$TERM" != "dumb" ] || [ -n "$EMACS" ]; then
  if [ "$OS_TYPE" = "Linux" ]; then
    #eval "`dircolors -b`"
    alias ls='ls --color=tty'
  else
    alias ls='ls -G'
  fi

  # alias grep='grep --color'
fi

alias lsa='ls -lah'
alias lld='ls -l | grep "^d"'
alias ll='ls -l'
alias la='ls -A'
alias l='ls -CF'
alias l.='ls -d .*'
# absolute ls
alias als='ls -d `pwd`/*'
alias tree='tree -CFA -I ".git" --dirsfirst'

alias pu='pushd'
alias po='popd'
alias ...='cd ../..'
alias -- -='cd -'

if [ "$OS_TYPE" != "Darwin" ]; then
  alias rm="rm.rb -I"
fi
alias mv="mv -i"
alias cp="cp -i"

alias ..='cd ..'
alias cd..='cd ..'
alias cd...='cd ../..'
alias cd....='cd ../../..'
alias cd.....='cd ../../../..'
alias cd/='cd /'

alias 1='cd -'
alias 2='cd +2'
alias 3='cd +3'
alias 4='cd +4'
alias 5='cd +5'
alias 6='cd +6'
alias 7='cd +7'
alias 8='cd +8'
alias 9='cd +9'

cd () {
  if   [[ "x$*" == "x..." ]]; then
    cd ../..
  elif [[ "x$*" == "x...." ]]; then
    cd ../../..
  elif [[ "x$*" == "x....." ]]; then
    cd ../../..
  elif [[ "x$*" == "x......" ]]; then
    cd ../../../..
  else
    builtin cd "$@"
  fi
}

alias md='mkdir -p'
alias rd=rmdir
alias d='dirs -v'

##################################################
# System
alias _='sudo'

alias psg="ps auxw | grep -i"

if which htop > /dev/null 2>&1; then
  alias top=htop
fi
alias ttop='ps -e -o pcpu,pid,args --sort pcpu | sed "/^ 0.0 /d"'

alias df="df -hT"
alias du="du -hc"
alias dus="du -S | sort -n"
alias free="free -m"

##################################################
# Utilities
alias ping="ping -c 5"
alias more="less"
alias ltail="less +F -R"
alias w3mgo="w3m http://www.google.com"

alias oneway="rsync -ltr --progress --delete"
alias archive="rsync -ltr --progress"

alias wcat='wget -q -0 -'
alias dog=wcat

if [ -x /usr/bin/colordiff ]; then
  alias diff=colordiff
fi

if [ -x "/usr/bin/prename" ]; then
  alias rename="/usr/bin/prename"
fi
if [ -x "/usr/bin/perl-rename" ]; then
  alias rename="/usr/bin/perl-rename"
fi

if yri --version > /dev/null 2>&1; then
  alias ri=yri
fi
alias irb=pry

##################################################
# Ext Aliases
alias -s html=w3m
alias -s pdf=zathura
alias -s png=geeqie
alias -s jpg=geeqie
alias -s svg=geeqie

##################################################
# Dir Aliases
cb=$HOME/CodeBase
dotfiles=$cb/dotfiles
dotemacs=$HOME/.emacs.d
dotvim=$HOME/.vim
ohmyzsh=$HOME/.oh-my-zsh
music='/My/iTunes/iTunes Media/Music'
