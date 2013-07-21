autoload -U compinit

fpath=(
  $ZSH/completions
  /usr/local/share/zsh-completions
  $fpath
)
zstyle ':completion:*:warnings' format '%BSorry, no matches for: %d%b'

unsetopt menu_complete
unsetopt flowcontrol
setopt auto_menu
setopt complete_in_word
setopt always_to_end

WORDCHARS=''
zmodload -i zsh/complist

# case sensitive
# zstyle ':completion:*' matcher-list 'r:|[._-]=* r:|=*' 'l:|=* r:|=*'
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}' 'r:|[._-]=* r:|=*' 'l:|=* r:|=*'

zstyle ':completion:*' list-colors ''

bindkey -M menuselect '^o' accept-and-infer-next-history

zstyle ':completion:*:*:*:*:*' menu select
zstyle ':completion:*:*:kill:*:processes' list-colors '=(#b) #([0-9]#) ([0-9a-z-]#)*=01;34=0=01'
zstyle ':completion:*:*:*:*:processes' command "ps -u `whoami` -o pid,user,comm -w -w"

# disable named-directories autocompletion
zstyle ':completion:*:cd:*' tag-order local-directories directory-stack path-directories
cdpath=(.)

# use /etc/hosts and known_hosts for hostname completion
[ -r ~/.ssh/known_hosts ] && _ssh_hosts=(${${${${(f)"$(<$HOME/.ssh/known_hosts)"}:#[\|]*}%%\ *}%%,*}) || _ssh_hosts=()
[ -r /etc/hosts ] && : ${(A)_etc_hosts:=${(s: :)${(ps:\t:)${${(f)~~"$(</etc/hosts)"}%%\#*}##[:blank:]#[^[:blank:]]#}}} || _etc_hosts=()
hosts=(
  "$_ssh_hosts[@]"
  "$_etc_hosts[@]"
  `hostname`
  localhost
)
zstyle ':completion:*:hosts' hosts $hosts

# Use caching so that commands like apt and dpkg complete are useable
zstyle ':completion::complete:*' use-cache 1
zstyle ':completion::complete:*' cache-path ~/.zsh/cache/

# Don't complete uninteresting users
zstyle ':completion:*:*:*:users' ignored-patterns \
        adm amanda apache avahi beaglidx bin cacti canna clamav daemon \
        dbus distcache dovecot fax ftp games gdm gkrellmd gopher \
        hacluster haldaemon halt hsqldb ident junkbust ldap lp mail \
        mailman mailnull mldonkey mysql nagios \
        named netdump news nfsnobody nobody nscd ntp nut nx openvpn \
        operator pcap postfix postgres privoxy pulse pvm quagga radvd \
        rpc rpcuser rpm shutdown squid sshd sync uucp vcsa xfs

# ... unless we really want to.
zstyle '*' single-ignored show

expand-or-complete-with-dots() {
  echo -n "\e[31m......\e[0m"
  zle expand-or-complete
  zle redisplay
}
zle -N expand-or-complete-with-dots
bindkey "^I" expand-or-complete-with-dots

##################################################
# Simple completion definitions 
compinit -u
compdef _tmuxinator mux
compdef _github gh=github
compdef _sudo proxychains
compdef _pacman yaourt=pacman

# cach rake
_rake () {
  if [ -f Rakefile ]; then
    if ! [ -f .rake_tasks~ ] || [ Rakefile -nt .rake_tasks~ ]; then
      echo "\nGenerating .rake_tasks~..." >&2
      bundler-exec rake --silent --tasks | cut -d " " -f 2 > .rake_tasks~
    fi
    compadd `cat .rake_tasks~`
  fi
}

compdef _rake rake

# cap cache
function _cap () {
  if [ -f config/deploy.rb ]; then
    if ! [ -f .cap_tasks~ ] || [ config/deploy.rb -nt .cap_tasks~ ]; then
      echo "\nGenerating .cap_tasks~..." >&2
      gemset deploy cap -T | grep '^cap ' | cut -d " " -f 2 > .cap_tasks~
    fi
    compadd `cat .cap_tasks~`
  fi
}

compdef _cap cap

L2TP_CONFIG_DIR="$HOME/Dropbox/Secrets/l2tp"
OVPN_CONFIG_DIR="$HOME/Dropbox/Secrets/openvpn"

_ovpn () {
  compadd $(ls $OVPN_CONFIG_DIR) '--route'
}

_l2tp () {
  compadd $(ls $L2TP_CONFIG_DIR | grep -v '^ip-\|^common$') connect up down stop '--route'
}

compdef _ovpn ovpn
compdef _l2tp l2tp
