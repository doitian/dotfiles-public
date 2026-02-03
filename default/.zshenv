if [[ -n "${CURSOR_AGENT:-}${OPENCODE:-}${GEMINI_CLI:-}"  ]]; then
    export AI_AGENT=true
fi
if [[ -z "${AI_AGENT:-}" && "${SHELL_ENV_LOADED:-}" ]] then
    return
fi
export SHELL_ENV_LOADED=1
: "${PATH:=/bin:/usr/bin:/usr/local/bin}"
export REMEMBER_PATH="${REMEMBER_PATH:-$PATH}"
[ -z "$HOME" ] && HOME="$(cd ~ && pwd)"
if [[ -n "$BASH_VERSION" && -f "$HOME/.bashrc" ]]; then
  . "$HOME/.bashrc"
fi
if [[ "$OSTYPE" == "linux"* && (-n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}") ]]; then
  export GPG_TTY="${TTY:-}"
fi

# path
export GOPATH="$HOME/codebase/gopath"
HOMEBREW_PREFIX=/home/linuxbrew/.linuxbrew
PATH_SECTION_A="$HOME/bin"
PATH_SECTION_B="$HOME/.cargo/bin:$GOPATH/bin:$HOME/.local/bin:$HOME/.bun/bin:$HOME/.local/share/nvim/mason/bin"
if [[ "$OSTYPE" == "linux"* && -O "$HOMEBREW_PREFIX/bin/brew" ]]; then
  export HOMEBREW_CELLAR="$HOMEBREW_PREFIX/Cellar"
  export HOMEBREW_REPOSITORY="$HOMEBREW_PREFIX/Homebrew"
  export HOMEBREW_NO_BOTTLE_SOURCE_FALLBACK=1
  export HOMEBREW_AUTO_UPDATE_SECS=86400

  PATH_SECTION_A="$PATH_SECTION_A:$HOMEBREW_PREFIX/bin:$HOMEBREW_PREFIX/sbin"
fi
unset HOMEBREW_PREFIX
if [ -z "${WSL_DISTRO_NAME:-}" ]; then
  export PATH="$PATH_SECTION_A:$REMEMBER_PATH:$PATH_SECTION_B"
else
  export PATH="$PATH_SECTION_A:/bin:/usr/bin:/usr/local/bin:$PATH_SECTION_B:$REMEMBER_PATH"
fi
unset PATH_SECTION_A
unset PATH_SECTION_B

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
