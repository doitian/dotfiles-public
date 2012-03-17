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
alias re='vim .rbenv-vars'
alias b='bundle exec'
alias rails='bundle exec rails'
alias gemset='rbenv gemset'

if [ -f $HOME/.rbenv/completions/rbenv.zsh ]; then
  source $HOME/.rbenv/completions/rbenv.zsh
fi

##################################################
# Bundle Alias

alias be="bundle exec"
alias bi="bundle install"
alias bl="bundle list"
alias bp="bundle package"
alias bu="bundle update"

bundled_commands=(cucumber foreman guard nanoc3 rackup rails rainbows rake rspec shotgun spec spork thin unicorn unicorn_rails knife)

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
    "$@"
  fi
}

compdef _sudo bundler-exec

## Main program
for cmd in $bundled_commands; do
  alias $cmd="bundler-exec $cmd"
done
