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

function rbundle() {
  bundle install --path "$HOME/.bundle/$(rbenv version-name)" "$@"
}

alias rl='rbenv local'
alias rv='vim .rbenv-vars'
alias b='bundle exec'

function rbundle() {
  exec bundle --path "$HOME/.bundle/$(rbenv version-name)" "$@"
}

function _gemset() {
  local -a _actions _gemsets
  _actions=(active create delete file list version)
  _gemsets=($(rbenv gemset list | grep '^ ' | uniq))
  _arguments ":action: _values actions ${_actions} ${_gemsets}" '*::arguments: _sudo'
}
compdef _gemset gemset

alias hub='gemset --global tools hub'
alias thor='gemset --global tools thor'
alias tmuxinator="gemset --global tools tmuxinator"
alias vagrant="gemset --global tools vagrant"
alias vmc="gemset --global tools vmc"
alias lolcat="gemset --global tools lolcat"
alias mux="tmuxinator"
compdef _tmuxinator mux
alias tss="tmuxinator start"
alias cap='gemset --global deploy cap'
alias capify='gemset --global deploy capify'
alias mina='gemset --global deploy mina'
alias rpry='gemset debug rails-console-pry -r awesome_print -r pry-doc -r hirb -r pry-nav -r pry-git -r pry-stack_explorer'
alias pry='gemset --global debug pry'
alias irb='pry'
alias sequel='gemset debug sequel'
alias puma='gemset debug puma'
alias puma3000='gemset debug puma -p 3000'

if [ -f $HOME/.rbenv/completions/rbenv.zsh ]; then
  source $HOME/.rbenv/completions/rbenv.zsh
fi

##################################################
# Bundle Alias
# from oh-my-zsh bundler plugin

alias bi="bundle install"
alias bl="bundle list"
alias bp="bundle package"
alias bu="bundle update"

bundled_commands=(
  cucumber guard nanoc rackup jeweler shotgun spork thin
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
      nanoc)
        gemset generator "$@"
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
