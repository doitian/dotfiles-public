if [[ "$-" != *i* ]]; then return 0; fi

if ! [[ -n "$SSH_TTY" && -S "$SSH_AUTH_SOCK" ]]; then
  export SSH_AUTH_SOCK="$HOME/.gnupg/S.gpg-agent.ssh"
fi
ZSH_CACHE_DIR="$HOME/.zcompcache"
ZSH="$HOME/.dotfiles/repos/public/zsh"
MAGIC_ENTER_GIT_COMMAND=" g st ."
MAGIC_ENTER_OTHER_COMMAND=" ll"

fpath=("$ZSH/functions" $fpath)

# Figure out the SHORT hostname
if [[ "$OSTYPE" = darwin* ]]; then
  # OS X's $HOST changes with dhcp, etc. Use ComputerName if possible.
  SHORT_HOST=$(scutil --get ComputerName 2>/dev/null) || SHORT_HOST=${HOST/.*/}
else
  SHORT_HOST=${HOST/.*/}
fi
ZSH_COMPDUMP="$HOME/.zcompdump-${SHORT_HOST}-${ZSH_VERSION}"

autoload -U compaudit compinit
if [[ -f "$ZSH_COMPDUMP"(Nm+1) ]]; then
  # force rebuilding daily
  compinit -i -d "${ZSH_COMPDUMP}"
  touch "${ZSH_COMPDUMP}"
else
  compinit -C -i -d "${ZSH_COMPDUMP}"
fi
