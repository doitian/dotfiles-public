#!/usr/bin/env zsh
export LESS='--RAW-CONTROL-CHARS --quiet --HILITE-UNREAD --ignore-case --long-prompt'
export LANG=en_US.UTF-8
export LC_CTYPE=$LANG
export LC_ALL=$LANG
if [ -x "/usr/bin/x-www-browser" ]; then
  export BROWSER="/usr/bin/x-www-browser"
fi
export ALTERNATE_EDITOR="vim"
export GREP_OPTIONS='--color=auto'
if [ -f /usr/libexec/java_home ]; then
  export JAVA_HOME=$(/usr/libexec/java_home)
fi

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

# safe path
SAFE_PATH_SECRET=safe
if [ -f "$HOME/.safe_path_secret" ]; then
  SAFE_PATH_SECRET=$(cat $HOME/.safe_path_secret)
fi
function mksafepath() {
  if [ -d .git ]; then
    mkdir -p ".git/$SAFE_PATH_SECRET"
  fi
}

# golang
export GOPATH="$HOME/codebase/gopath"

# fzf
export FZF_DEFAULT_COMMAND="ag -g ''"

if ! which fresh &> /dev/null; then
  export PATH=".git/$SAFE_PATH_SECRET/../../bin\
:$HOME/bin\
:$HOME/.rbenv/bin:$HOME/.rbenv/shims\
:$GOPATH/bin\
:$HOME/.node-packages/bin\
:/PATH\
:$PATH\
:/usr/local/bin\
:/usr/local/sbin\
:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools\
"
fi