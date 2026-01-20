if [[ -n "${CURSOR_AGENT:-}" ]]; then
    export AI_AGENT=true
fi
if [[ -z "${AI_AGENT:-}" && "${SHELL_ENV_LOADED:-}" ]] then
    return
fi
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
HOMEBREW_PREFIX=/home/linuxbrew/.linuxbrew
COMMON_PATH_AFTER="$HOME/.cargo/bin:$GOPATH/bin:$HOME/.local/bin:$PNPM_HOME:$HOME/.local/share/nvim/mason/bin"
if [[ "$OSTYPE" == "linux"* && -O "$HOMEBREW_PREFIX/bin/brew" ]]; then
  export HOMEBREW_CELLAR="$HOMEBREW_PREFIX/Cellar"
  export HOMEBREW_REPOSITORY="$HOMEBREW_PREFIX/Homebrew"
  export HOMEBREW_NO_BOTTLE_SOURCE_FALLBACK=1
  export HOMEBREW_AUTO_UPDATE_SECS=86400

  export PATH="$HOME/bin:$HOMEBREW_PREFIX/bin:$HOMEBREW_PREFIX/sbin:${PATH:-/bin:/usr/bin:/usr/local/bin}:$COMMON_PATH_AFTER"
else
  export PATH="${PATH:-/bin:/usr/bin:/usr/local/bin}:$HOME/bin:$COMMON_PATH_AFTER"
  unset HOMEBREW_PREFIX
fi
unset COMMON_PATH_AFTER

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
if [ "$TERM_BACKGROUND" = dark ]; then
  export FZF_DEFAULT_OPTS="--prompt='❯ '"
  export BAT_THEME='OneHalfDark'
  export LG_CONFIG_FILE="$HOME/.config/lazygit/config.yml,$HOME/.config/lazygit/config-dark.yml"
fi

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

# mise for AI
if [[ -n "${AI_AGENT:-}" ]]; then
  export GIT_PAGER=
  if command -v mise &> /dev/null; then
    eval "$(mise activate zsh)"
  fi
fi
