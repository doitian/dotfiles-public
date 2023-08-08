##################################################
# Editor
: "${__VIM_PROGRAM__:="$HOME/bin/nvim"}"
alias vim="$__VIM_PROGRAM__"
alias :e="$__VIM_PROGRAM__"
alias vi="$__VIM_PROGRAM__"
alias view="$__VIM_PROGRAM__ -R"
alias viper="$__VIM_PROGRAM__ +Viper"

##################################################
# TMUX
alias t='tmux'
alias ta='tmux-fzf-session'
alias tj='tmux-fzf-pane -s -p'
alias tk='tmux-fzf-pane -a -p'
alias tl='tmux ls'
alias tns='tmux new -s'
alias tnw='tmux neww'
alias tu=' tmux-up'
function twn() {
  tmux rename-window "${1:-"${PWD##*/}"}"
}

##################################################
# Git
alias g='git'
alias gf='git flow'
alias gfb='git flow bugfix'
alias gff='git flow feature'
alias gfh='git flow hotfix'
alias gfr='git flow release'
alias gfs='git flow support'
alias lg='lazygit'
alias lgg='lazygit -g "$(git rev-parse --git-dir)"'

##################################################
# Directories
if [ -n "$ZSH_VERSION" ]; then
  alias -g ...='../..'
  alias -g ....='../../..'
  alias -g .....='../../../..'
  alias -g ......='../../../../..'
else
  alias ..='cd ..'
  alias ...='cd ../..'
  alias ....='cd ../../..'
  alias .....='cd ../../../..'
  alias ......='cd ../../../../..'
fi

alias -- -='cd -'
alias 1='cd -1'
alias 2='cd -2'
alias 3='cd -3'
alias 4='cd -4'
alias 5='cd -5'
alias 6='cd -6'
alias 7='cd -7'
alias 8='cd -8'
alias 9='cd -9'

alias md='mkdir -p'
alias rd=rmdir

function d() {
  if [[ -n $1 ]]; then
    dirs "$@"
  else
    dirs -v | head -n 10
  fi
}

alias ll='ls -lh'
alias la='ls -lah'

##################################################
# File
alias cp='cp -i'
alias cpv='rsync -poghb --backup-dir=/tmp/rsync -e /dev/null --progress --'
alias fd.='fd --hidden'
alias ff='fzf-finder'
alias mv='mv -i'
alias rg.='rg --hidden'
alias rm='rm -i'
alias rsync-copy='rsync -av --progress -h'
alias rsync-diff='rsync -nav --delete'
alias rsync-move='rsync -av --progress -h --remove-source-files'
alias rsync-synchronize='rsync -avu --delete --progress -h'
alias rsync-update='rsync -avu --progress -h'

##################################################
# Utilities
alias ltail='less +F -R'
alias mk=make
alias more='less'
alias ping='ping -c 5'
# ps tty
alias pst="ps -o pid,time,%cpu,%mem,args -w -w"
# ps my processes
alias psu="ps -u $UID -o pid,tt,time,%cpu,%mem,args -w -w"
# ps all users
alias psa="ps -A -o pid,user,time,%cpu,%mem,args -w -w"

##################################################
# Skip History
alias fg=' fg'

##################################################
# Precommands
alias gfw='gfw '
alias sudo='sudo '
if [[ "$OSTYPE" == "darwin"* ]]; then
  alias ts='ts '
else
  alias ts='tsp '
fi

##################################################
# Dir Aliases
cb="$HOME/codebase"
brain="$HOME/Dropbox/Brain"
dl="$HOME/Downloads"
dotfiles="$HOME/.dotfiles"
dotpublic="$HOME/.dotfiles/repos/public"
dotprivate="$HOME/.dotfiles/repos/private"
