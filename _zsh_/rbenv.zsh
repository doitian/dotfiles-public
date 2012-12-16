function rbenv() {
  command="$1"
  if [ "$#" -gt 0 ]; then
    shift
  fi

  case "$command" in
  shell)
    eval `rbenv "sh-$command" "$@"`;;
  *)
    command rbenv "$command" "$@";;
  esac
}

alias ru='rbenv local'
alias re='rbenv exec'
alias rv='vim .rbenv-vars'
alias b='bundle exec'

# unset global RBENV_GEMSET_FILE
unset RBENV_GEMSET_FILE
function gemset() {
  if [ -z "$1" ]; then
    rbenv gemset active
  else
    local action="$1"
    shift
    case "$action" in
      active|create|delete|file|list|version)
        rbenv gemset "$action" "$@"
        ;;
      *)
        local tmp=$(mktemp /tmp/gemsetXXXXXXXX)
        echo "$action" > "$tmp"
        RBENV_GEMSET_FILE="$tmp" "$@"
        rm "$tmp"
        ;;
    esac
  fi
}
nfunction _gemset() {
  local -a _actions _gemsets
  _actions=(active create delete file list version)
  _gemsets=($(rbenv gemset list | grep '^ ' | uniq))
  _arguments ":action: _values actions ${_actions} ${_gemsets}" '*::arguments: _sudo'
}
compdef _gemset gemset

alias github='gemset tools github'
alias gh=github
alias tmuxinator="gemset tools tmuxinator"
alias heroku="gemset tools heroku"
alias vagrant="gemset tools vagrant"
alias vmc="gemset tools vmc"
alias lolcat="gemset tools lolcat"
alias mux="tmuxinator"
compdef _tmuxinator mux
alias tss="tmuxinator start"
alias cap='gemset deploy cap'
alias capify='gemset deploy capify'
alias pry='gemset debug pry'
alias rpry='gemset debug rails-console-pry -r awesome_print -r pry-doc -r hirb'
alias irb='pry'
alias sequel='gemset debug sequel'
alias foreman='gemset tools foreman'

if [ -f $HOME/.rbenv/completions/rbenv.zsh ]; then
  source $HOME/.rbenv/completions/rbenv.zsh
fi

##################################################
# Bundle Alias
# from oh-my-zsh bundler plugin

alias be="bundle exec"
alias bi="bundle install"
alias bl="bundle list"
alias bp="bundle package"
alias bu="bundle update"

bundled_commands=(
  cucumber guard nanoc rackup rails jeweler rake rspec shotgun spec spork thin
  unicorn unicorn_rails knife foreman
)

_bundler-installed() {
  which bundle > /dev/null 2>&1
}

_within-bundled-project() {
  local check_dir=$PWD
  while [ "$(dirname $check_dir)" != "/" ]; do
    [ -f "$check_dir/Gemfile" ] && return
    check_dir="$(dirname $check_dir)"
  done
  false
}

bundler-exec() {
  if _bundler-installed && _within-bundled-project; then
    bundle exec "$@"
  else
    case "$1" in
      nanoc|rails)
        gemset generator "$@"
        ;;
      foreman)
        gemset tools "$@"
        ;;
      *)
        "$@"
        ;;
    esac
  fi
}

compdef _sudo bundler-exec

## Main program
for cmd in $bundled_commands; do
  alias $cmd="bundler-exec $cmd"
done
