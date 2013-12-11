# -*- sh -*-
OS_TYPE=`uname -s`

##################################################
# Editor
alias e="emacs-dwim"
alias et="emacs-dwim -t"
alias en="emacs-dwim -n"
alias fp="file-picker"
alias vi='vim'
alias v='vim'
function tv() {
  tmux neww "vim $*"
}
alias view='vim -R'

##################################################
# Command Edit
alias h=history
alias hsi="hs -i"
alias hl="history"
alias hr="history -n"
alias :q="exit"

##################################################
# TMUX
alias ts=tmux-new-or-attach
alias t="tmux"
alias tl="tmux ls"
alias tn="tmux neww"
alias mux="tmuxinator"
alias tss="tmuxinator start"

##################################################
# Yaourt
alias y="yaourt"
alias yy="yaourt -S"
alias yyy="yaourt -Sy"
alias yY="yaourt -S --noconfirm"
alias yyY="yaourt -S --noconfirm"
alias yC="yaourt -C"
alias ys="yaourt -Ss"
alias yl="yaourt -Ql"
alias yi="yaourt -Qi"
alias yO="yaourt -Qo"
alias yu="yaourt -Syu --aur"
alias yU="yaourt -Syu --aur --noconfirm"
alias yc="yaourt -Sc"
alias yD="yaourt -Qdt"
alias yd="yaourt -Rcs"

##################################################
# Git
alias g="git"
alias gst="git st"
alias ga="git add"
alias gaa="git add -A"
alias gau="git add -u"
alias gl="git l"
alias gll="git ll"
alias glll="git lll"
alias glg="git lg"
alias gh="hub"

##################################################
# File & Direcotry
if [ "$TERM" != "dumb" ] || [ -n "$EMACS" ]; then
  if [ "$OS_TYPE" = "Linux" -o "$OS_TYPE" = "CYGWIN_NT-5.1" ]; then
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
alias sgrep='grep -R -n -H -C 5 --exclude-dir={.git,.svn,CVS} '

alias dud='du --max-depth=1 -h'
alias duf='du -sh *'
alias fd='find . -type d -name'
alias ff='find . -type f -name'

alias pu='pushd'
alias po='popd'

if which ruby &> /dev/null; then
  if [ "$OS_TYPE" = "Darwin" ]; then
    alias rm="$HOME/.rm-trash/rm.rb"
  else
    alias rm="rm.rb -I"
  fi
fi
alias mv="mv -i"
alias cp="cp -i"
alias cpv="rsync -poghb --backup-dir=/tmp/rsync -e /dev/null --progress --"

alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias .....='cd ../../../..'
alias cd..='cd ..'
alias cd...='cd ../..'
alias cd....='cd ../../..'
alias cd.....='cd ../../../..'
alias cd/='cd /'

alias -- -='dirs -v'
alias dv='dirs -v'
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

# fasd
if which fasd > /dev/null 2>&1; then
  eval "$(fasd --init auto)"
  unalias z
  alias j='fasd_cd -d'
  alias jj='fasd_cd -d -i'
  alias sf='fasd -sif'
  alias sd='fasd -sid'
  alias o="fasd -e open -f"
  alias oo="fasd -e open -f -i"
  alias ee="fasd -e emacs-dwim -f -i"
fi

alias md='mkdir -p'
alias rd=rmdir

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
alias lr="less -R"
alias lnum='less -N'
alias w3mgo="w3m http://www.google.com"
alias sortnr='sort -n -r'

alias oneway="rsync -ltr --progress --delete"
alias archive="rsync -ltr --progress"
alias rsync-copy="rsync -av --progress -h"
alias rsync-move="rsync -av --progress -h --remove-source-files"
alias rsync-update="rsync -avu --progress -h"
alias rsync-synchronize="rsync -avu --delete --progress -h"

alias wcat='wget -q -0 -'
alias dog=wcat

if [ -x /usr/bin/colordiff ]; then
  alias diff=colordiff
fi

if yri --version > /dev/null 2>&1; then
  alias ri="yri"
fi

alias ibc="{echo 'scale=6';cat} | bc"
function bcc () {
  local scale=6
  if [ "$1" = "-s" ]; then
    shift
    scale="$1"
    shift
  fi
  {
    echo "scale=$scale"
    echo "$*"
  } | bc
}

alias m=mplayer
alias mmm=vlc

alias ssh="TERM=xterm-256color ssh"

alias mk=make

alias cmr=cmus-remote

alias am="$HOME/codebase/automators/bin/automator"

alias vtig="GIT_EDITOR=vim tig"

alias urlencode='node -e "console.log(encodeURIComponent(process.argv[1]))"'
alias urldecode='node -e "console.log(decodeURIComponent(process.argv[1]))"'
encode64(){ echo -n $1 | base64 }
decode64(){ echo -n $1 | base64 --decode }
alias e64=encode64
alias d64=decode64

if which systemctl &> /dev/null; then
  alias start="sudo systemctl start "
  alias stop="sudo systemctl stop "
  alias restart="sudo systemctl restart "
else
  alias start.mysql="mysql.server start"
  alias start.pg="pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/server.log start"
  alias start.redis="redis-server /usr/local/etc/redis.conf"
  alias start.mongo="mongod --fork"
  alias start.memcache="memcached -d"
  alias start.confluence="/opt/atlassian-confluence-5.2.3/bin/start-confluence.sh"
  alias stop.mysql="mysql.server stop"
  alias stop.pg="pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/server.log stop"
  alias stop.redis="killall redis-server"
  alias stop.mongo="killall mongod"
  alias stop.memcache="killall memcached"
  alias stop.confluence="/opt/atlassian-confluence-5.2.3/bin/stop-confluence.sh"
fi

alias igssh='l2tp stop; l2tp --route igssh'
alias vpncloud='l2tp stop; l2tp --route igssh'

alias dj=django

alias vboxmanage=VBoxManage
alias vboxheadless=VBoxHeadless

alias vbox=VBoxManage
alias vheadless=VBoxHeadless

alias ap=apack
alias al=als
alias au=aunpack
alias ac=acat
alias ad=adiff

##################################################
# Ext Aliases
alias -s html=w3m
alias -s pdf=zathura
alias -s png=geeqie
alias -s jpg=geeqie
alias -s svg=geeqie

##################################################
# Dir Aliases
cb=$HOME/codebase
ws=$HOME/workspace
gop=$GOPATH
dp=$HOME/Dump
box=$HOME/Dropbox
docs=$HOME/Documents
dotemacs=$HOME/.emacs.d
dotvim=$HOME/.vim
ohmyzsh=$HOME/.oh-my-zsh

