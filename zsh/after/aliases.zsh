##################################################
# Editor
: "${__VIM_PROGRAM__:="$HOME/bin/nvim"}"
alias vim="$__VIM_PROGRAM__"
alias :e="$__VIM_PROGRAM__"
alias vi="$__VIM_PROGRAM__"
alias view="$__VIM_PROGRAM__ -R"
alias viper="$__VIM_PROGRAM__ +Viper /dev/null"

##################################################
# TMUX
alias t='tmux'
alias tA='tmux-launcher'
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
alias gt='git town'
alias gtb='git town branch'
alias gts='git town switch'
alias lg='lazygit -g "$(git rev-parse --git-dir)"'

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

function j {
  local selected="$(fzf -0 -1 -q "$*" <"$HOME/.j.path")"
  if [ -n "$selected" ]; then
    cd "$selected"
  else
    echo "no matched directory found" >&2
  fi
}
function jadd {
  pwd >> "$HOME/.j.path"
}

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
alias more='less'
alias ping='ping -c 5'
# ps tty
alias pst="ps -o pid,time,%cpu,%mem,args -w -w"
# ps my processes
alias psu="ps -u $UID -o pid,tt,time,%cpu,%mem,args -w -w"
# ps all users
alias psa="ps -A -o pid,user,time,%cpu,%mem,args -w -w"
alias pstg="pst | rg"
alias psug="psu | rg"
alias psag="psa | rg"
alias mx="mise x --"
alias mr="mise run"
function mact() {
  eval "$(mise activate "$@")"
}

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
dotfiles="$HOME/.dotfiles"
cb="$HOME/codebase"
dl="$HOME/Downloads"
