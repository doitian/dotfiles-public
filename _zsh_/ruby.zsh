compctl -k _rbenv rbenv

_rbenv() {
  local words completions
  read -ca words

  if [ "${#words}" -eq 2 ]; then
    completions="$(rbenv commands)"
  else
    completions="$(rbenv completions ${words[2,-1]})"
  fi

  reply=("${(ps:\n:)completions}")
}

rbenv rehash 2>/dev/null
rbenv() {
  typeset command
  command="$1"
  if [ "$#" -gt 0 ]; then
    shift
  fi

  case "$command" in
  rehash|shell)
    eval `rbenv "sh-$command" "$@"`;;
  *)
    command rbenv "$command" "$@";;
  esac
}

alias hbundle='bundle install --path vendor/bundle'
alias b='bundle exec'
alias irb='pry'
alias bi="bundle install"
alias bl="bundle list"
alias bp="bundle package"
alias bu="bundle update"

bundled_commands=(
  cucumber guard nanoc rackup jeweler shotgun thin
  unicorn unicorn_rails knife
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
