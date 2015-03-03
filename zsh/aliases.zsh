# -*- sh -*-
##################################################
# Editor
alias e="emacs-dwim"
alias et="emacs-dwim -t"
alias en="emacs-dwim -n"
alias fp="file-picker"
alias vi='vim'
alias :e=vim
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
# Git
alias g="git"
function gi() { curl -k "https://www.gitignore.io/api/$1" }
alias gst="git st"
alias ga="git add"
alias gaa="git add -A"
alias gau="git add -u"
alias gn="git number -s"
alias gna="git number add"
alias gnc="git number -c"
alias gl="git l"
alias gll="git ll"
alias glll="git lll"
alias glg="git lg"
alias gh="hub"

# absolute ls
alias als='ls -d `pwd`/*'
alias tree='tree -CFA -I ".git" --dirsfirst'

alias dud='du --max-depth=1 -h'
alias duf='du -sh *'
alias fd='find . -type d -name'
alias ff='find . -type f -name'

alias rm="rm -i"
alias mv="mv -i"
alias cp="cp -i"
alias cpv="rsync -poghb --backup-dir=/tmp/rsync -e /dev/null --progress --"

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
  alias v="fasd -e vim -f"
  alias vv="fasd -e vim -f -i"
  alias gv="fasd -e 'gvim --remote' -f"
  alias gvv="fasd -e 'gvim --remote' -f -i"
fi

alias md='mkdir -p'
alias rd=rmdir

##################################################
# System
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
  alias start.mongo="mongod --config /usr/local/etc/mongod.conf --fork"
  alias start.memcache="memcached -d"
  alias start.confluence="/opt/atlassian-confluence-5.2.3/bin/start-confluence.sh"
  alias start.pow="sudo pfctl -e"
  alias stop.mysql="mysql.server stop"
  alias stop.pg="pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/server.log stop"
  alias stop.redis="killall redis-server"
  alias stop.mongo="killall mongod"
  alias stop.memcache="killall memcached"
  alias stop.confluence="/opt/atlassian-confluence-5.2.3/bin/stop-confluence.sh"
fi

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
ws=$HOME/Documents/workspace
gop=$GOPATH
box=$HOME/Dropbox
docs=$HOME/Documents
dl=$HOME/Downloads
dotemacs=$HOME/.emacs.d
dotsubl="$HOME/Library/Application Support/Sublime Text 3/Packages"
dotvim=$HOME/.vim
omz=$HOME/.fresh/source/robbyrussell/oh-my-zsh
omzp=$omz/plugins
pj=$HOME/Documents/svn
