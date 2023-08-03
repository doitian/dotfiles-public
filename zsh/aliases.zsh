# -*- sh -*-
##################################################
# Editor
__VIM_PROGRAM__="${__VIM_PROGRAM__:-vim}"
if [ "$__VIM_PROGRAM__" != vim ]; then
  alias vim="$__VIM_PROGRAM__"
fi
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
alias lr='less -R'
alias ltail='less +F -R'
alias mk=make
alias more='less'
alias ping='ping -c 5'
alias psg='ps auxw | grep -i'

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
