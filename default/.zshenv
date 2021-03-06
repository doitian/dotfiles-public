#!/usr/bin/env zsh

# safe path
SAFEBIN_SECRET=safebin
if [ -f "$HOME/.safebin" ]; then
  SAFEBIN_SECRET="safebin-$(cat "$HOME/.safebin")"
fi
function mksafebin() {
  if [ -n "$SAFEBIN_SECRET" ] && [ -d .git ]; then
    mkdir -p ".git/$SAFEBIN_SECRET"
  else
    echo "not available"
    false
  fi
}

if echo "$PATH" | grep -q ':/PATH:'; then
  return
fi

if [ -z "$HOME" ]; then
  HOME="$(cd ~ && pwd)"
fi

if [ -n "$BASH_VERSION" ]; then
  # include .bashrc if it exists
  if [ -f "$HOME/.bashrc" ]; then
    . "$HOME/.bashrc"
  fi
fi

if [ -f /usr/bin/mdfind ]; then
  ulimit -n 200000 &> /dev/null
  ulimit -u 2048 &> /dev/null
fi

export LESS='--RAW-CONTROL-CHARS --quiet --HILITE-UNREAD --ignore-case --long-prompt --no-init'
export LANG=en_US.UTF-8
export LC_CTYPE=$LANG
export LC_ALL=$LANG
if [ -x "/usr/bin/x-www-browser" ]; then
  export BROWSER="/usr/bin/x-www-browser"
fi
export ALTERNATE_EDITOR="vim"
if [ -f /usr/libexec/java_home ]; then
  export JAVA_HOME=$(/usr/libexec/java_home)
fi
# export JAVA_OPTS="--add-modules=java.se.ee"

if [ "$TERM" = "rxvt-unicode" ]; then
  export TERM=rxvt-256color
fi
export EDITOR="vim"
export FCEDIT="vim"
export VISUAL="vim"

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

# python
export PIPENV_VERBOSITY=-1

# R
export R_LIBS="$HOME/.rlibs"

# Android
if [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export ANDROID_SWT="$ANDROID_HOME/tools/lib/x86_64"
else
  export ANDROID_HOME=/opt/android-sdk
  export ANDROID_SWT=/usr/share/java
fi

# golang
export GOPATH="$HOME/codebase/gopath"

# rust
if [ type rustc &> /dev/null ]; then
  export RUST_SRC_PATH=$(rustc --print sysroot)/lib/rustlib/src/rust/src/
fi

# fzf
export FZF_DEFAULT_OPTS='--color light,fg:#3c3b3a'
export FZF_DEFAULT_COMMAND='rg --no-messages --hidden -g "!.git" --color never --files'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"

# bat
export BAT_THEME='OneHalfLight'

# gpg
if [[ "$OSTYPE" = linux* ]]; then
  export GPG_TTY="$(tty)"
fi

export HOMEBREW_NO_BOTTLE_SOURCE_FALLBACK=1

export PATH="\
.git/$SAFEBIN_SECRET/../../bin\
:$HOME/bin\
:$HOME/.local/bin\
:$GOPATH/bin\
:$HOME/.cargo/bin\
:$HOME/.asdf/bin:$HOME/.asdf/shims\
:$HOME/.node-packages/bin\
:/PATH\
:$PATH\
:/usr/local/bin\
:/usr/local/sbin\
:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools\
"
