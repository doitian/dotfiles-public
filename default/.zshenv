[ -n "${SHELL_ENV_LOADED:-}" ] && return
export SHELL_ENV_LOADED=1
[ -z "$HOME" ] && HOME="$(cd ~ && pwd)"
if [[ -n "$BASH_VERSION" && -f "$HOME/.bashrc" ]]; then
  . "$HOME/.bashrc"
fi

# path
export GOPATH="$HOME/codebase/gopath"
export PATH="${PATH:-/bin:/usr/bin}:$HOME/bin:$GOPATH/bin:$HOME/.cargo/bin:$HOME/.asdf/bin:$HOME/.node-packages/bin:$HOME/.local/share/nvim/mason/bin:/usr/local/bin"
if [ -n "$VSCODE_RESOLVING_ENVIRONMENT" ]; then
  export PATH="$PATH:$HOME/.asdf/shims"
fi

# use gpg as ssh-agent
if ! [[ -n "$SSH_TTY" && -S "$SSH_AUTH_SOCK" ]]; then
  export SSH_AUTH_SOCK="$HOME/.gnupg/S.gpg-agent.ssh"
fi

# lang
export LANG=en_US.UTF-8
export LC_CTYPE=$LANG
export LC_ALL=$LANG

# ulimit
if [ -f /usr/bin/mdfind ]; then
  ulimit -n 200000 &>/dev/null
  ulimit -u 2048 &>/dev/null
fi

# theme
export LESS='--RAW-CONTROL-CHARS --quiet --HILITE-UNREAD --ignore-case --long-prompt --no-init'
export TERM_BACKGROUND="${TERM_BACKGROUND:-light}"
unset BAT_THEME FZF_DEFAULT_OPTS
if [ "$TERM_BACKGROUND" = light ]; then
  export BAT_THEME='Coldark-Cold'
  export FZF_DEFAULT_OPTS='--color light'
fi
export DIRENV_LOG_FORMAT=$'\001\e[30m\002.- %s\001\e[0m\002'
if [[ $COLORTERM =~ ^(truecolor|24bit)$ ]]; then
  export LAZY=1
fi

# tools
export __VIM_PROGRAM__="$HOME/bin/vim"
export EDITOR="$HOME/bin/vim"
export FCEDIT="$EDITOR"
export VISUAL="$EDITOR"
export ALTERNATE_EDITOR="$EDITOR"
export PAGER="${PAGER:=less}"

# homebrew
export HOMEBREW_NO_BOTTLE_SOURCE_FALLBACK=1

# zoxide
export _ZO_EXCLUDE_DIRS="$HOME/Public"
