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
# export GREP_COLOR='33'
# export GOPATH="$HOME/.go"
if [ -f /usr/libexec/java_home ]; then
  export JAVA_HOME=$(/usr/libexec/java_home)
fi
# export GROOVY_HOME=/usr/local/opt/groovy

if [ "$(uname -s)" = "CYGWIN_NT-5.1" ] || [ -f "$HOME/.prefer_vim" ]; then
  if [ "$TERM" = "rxvt-unicode" ]; then
    export TERM=rxvt-256color
  fi
  export EDITOR="vim"
  export FCEDIT="vim"
  export VISUAL="vim"
else
  # export FCEDIT="subl -w"
  # export VISUAL="subl -w"
  # export EDITOR="subl -w"
  # export FCEDIT="emacs-dwim -t"
  # export VISUAL="emacs-dwim -t"
  # export EDITOR="emacs-dwim"
  export EDITOR="vim"
  export FCEDIT="vim"
  export VISUAL="vim"
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

# Android
if [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export ANDROID_SWT="$ANDROID_HOME/tools/lib/x86_64"
  export NDK_ROOT="$HOME/Library/Android/ndk"
else
  export ANDROID_HOME=/opt/android-sdk
  export ANDROID_SWT=/usr/share/java
fi

# Cocos2d-x

# Add environment variable COCOS_X_ROOT for cocos2d-x
export COCOS_X_ROOT=/Users/ian/Library/cocos2d/cocos2d-x-3.3
export COCOS_TEMPLATES_ROOT=$COCOS_X_ROOT/templates
export COCOS_CONSOLE_ROOT=$COCOS_X_ROOT/tools/cocos2d-console/bin
export QUICK_COCOS2DX_ROOT=`cat ~/.QUICK_COCOS2DX_ROOT`

export PATH="$HOME/bin\
:$HOME/.rbenv/bin:$HOME/.rbenv/shims\
:$HOME/.node-packages/bin\
:$COCOS_CONSOLE_ROOT\
:$PATH\
:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$NDK_ROOT\
"

# Not used recently
# :$GOPATH/bin\
# :$HOME/.play/play-default\
# :$HOME/.perl5/bin\

if [ -f "$HOME/.safe_path_secret" ]; then
  function mksafepath() {
    if [ -d .git ]; then
      mkdir -p ".git/$(cat $HOME/.safe_path_secret)"
    fi
  }
  export PATH=".git/$(cat $HOME/.safe_path_secret)/../../bin:$PATH"
fi
