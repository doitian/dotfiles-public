#!/usr/bin/env zsh
[ -n "${SHELL_ENV_LOADED:-}" ] && return
export SHELL_ENV_LOADED=1

[ -z "$HOME" ] && HOME="$(cd ~ && pwd)"

export LANG=en_US.UTF-8
export LC_CTYPE=$LANG
export LC_ALL=$LANG
if [[ -n "$BASH_VERSION" && -f "$HOME/.bashrc" ]]; then
  . "$HOME/.bashrc"
fi

# path
export PATH="$PATH:$HOME/bin:$GOPATH/bin:$HOME/.cargo/bin:$HOME/.asdf/bin:$HOME/.node-packages/bin:$HOME/.local/share/nvim/mason/bin:/usr/local/bin"

# ulimit
if [ -f /usr/bin/mdfind ]; then
  ulimit -n 200000 &> /dev/null
  ulimit -u 2048 &> /dev/null
fi

# theme
export LESS='--RAW-CONTROL-CHARS --quiet --HILITE-UNREAD --ignore-case --long-prompt --no-init'
export TERM_BACKGROUND="${TERM_BACKGROUND:-light}"
unset BAT_THEME FZF_DEFAULT_OPTS
if [ "$TERM_BACKGROUND" = light ]; then
  export BAT_THEME='Coldark-Cold'
  export FZF_DEFAULT_OPTS='--color light'
fi
export DIRENV_LOG_FORMAT="$(printf "\033[1;30m.- %%s\033[0m")"

# tools
export __VIM_PROGRAM__=vim
if command -v nvim &> /dev/null; then
  export __VIM_PROGRAM__=nvim
fi
export EDITOR="$__VIM_PROGRAM__"
export FCEDIT="$EDITOR"
export VISUAL="$EDITOR"
export ALTERNATE_EDITOR="$EDITOR"
if [ -x "/usr/bin/x-www-browser" ]; then
  export BROWSER="/usr/bin/x-www-browser"
fi

# ruby perf
export RUBY_GC_HEAP_INIT_SLOTS=1000000
export RUBY_HEAP_SLOTS_INCREMENT=1000000
export RUBY_HEAP_SLOTS_GROWTH_FACTOR=1
export RUBY_GC_MALLOC_LIMIT=1000000000
export RUBY_HEAP_FREE_MIN=500000

# perl
export PERL_LOCAL_LIB_ROOT="$PERL_LOCAL_LIB_ROOT:$HOME/.perl5";
export PERL_MB_OPT="--install_base $HOME/.perl5";
export PERL_MM_OPT="INSTALL_BASE=$HOME/.perl5";
export PERL5LIB="$HOME/.perl5/lib/perl5:$PERL5LIB";

# R
export R_LIBS="$HOME/.rlibs"

# golang
export GOPATH="$HOME/codebase/gopath"

# rust
if [ type rustc &> /dev/null ]; then
  export RUST_SRC_PATH=$(rustc --print sysroot)/lib/rustlib/src/rust/src/
fi

# java
if [ -f /usr/libexec/java_home ]; then
  export JAVA_HOME=$(/usr/libexec/java_home)
fi

# homebrew
export HOMEBREW_NO_BOTTLE_SOURCE_FALLBACK=1
