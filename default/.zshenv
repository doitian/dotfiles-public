[ -n "${SHELL_ENV_LOADED:-}" ] && return
export SHELL_ENV_LOADED=1
[ -z "$HOME" ] && HOME="$(cd ~ && pwd)"
if [[ -n "$BASH_VERSION" && -f "$HOME/.bashrc" ]]; then
  . "$HOME/.bashrc"
fi
if [[ "$OSTYPE" == "linux"* && (-n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}") ]]; then
  export GPG_TTY="${TTY:-}"
fi

# path
export GOPATH="$HOME/codebase/gopath"
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="${PATH:-/bin:/usr/bin:/usr/local/bin}:$HOME/bin:$HOME/.cargo/bin:$GOPATH/bin:$HOME/.local/bin:$PNPM_HOME:$HOME/.local/share/nvim/mason/bin"

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

# also edit tmux.*.conf set-background
if [[ -z "${TERM_BACKGROUND-}" && "$TERM_PROGRAM" == Apple_Terminal ]]; then
  TERM_BACKGROUND="$(defaults read -g AppleInterfaceStyle 2>/dev/null | tr 'A-Z' 'a-z')"
  apple_terminal_appearance
fi
export TERM_BACKGROUND="${TERM_BACKGROUND:-light}"
export FZF_DEFAULT_OPTS="--prompt='❯ ' --color light"
export BAT_THEME='OneHalfLight'
unset DELTA_FEATURES
if [ "$TERM_BACKGROUND" = dark ]; then
  export FZF_DEFAULT_OPTS="--prompt='❯ '"
  export BAT_THEME='OneHalfDark'
  export LG_CONFIG_FILE="$HOME/.config/lazygit/config.yml,$HOME/.config/lazygit/config-dark.yml"
  export DELTA_FEATURES='+zebra-dark'
fi

export DIRENV_LOG_FORMAT=$'\001\e[30m\002.- %s\001\e[0m\002'
if [[ "$COLORTERM" =~ ^(truecolor|24bit)$ ]]; then
  export LAZY=1
fi

# tools
export __VIM_PROGRAM__="$HOME/bin/nvim"
export EDITOR="$__VIM_PROGRAM__"
export FCEDIT="$EDITOR"
export VISUAL="$EDITOR"
export ALTERNATE_EDITOR="$EDITOR"
export PAGER="${PAGER:=less}"

# homebrew
HOMEBREW_PREFIX=/home/linuxbrew/.linuxbrew
if [[ "$OSTYPE" == "linux"* && -O "$HOMEBREW_PREFIX/bin/brew" ]]; then
  export HOMEBREW_CELLAR="$HOMEBREW_PREFIX/Cellar"
  export HOMEBREW_REPOSITORY="$HOMEBREW_PREFIX/Homebrew"
  export PATH="$HOMEBREW_PREFIX/bin:$HOMEBREW_PREFIX/sbin:$PATH"
else
  unset HOMEBREW_PREFIX
fi
export HOMEBREW_NO_BOTTLE_SOURCE_FALLBACK=1
export HOMEBREW_AUTO_UPDATE_SECS=86400
