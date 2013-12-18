export RBENV_SHELL=zsh
compctl -K _rbenv rbenv

_rbenv() {
  local words completions
  read -cA words

  if [ "${#words}" -eq 2 ]; then
    completions="$(rbenv commands)"
  else
    completions="$(rbenv completions ${words[2,-2]})"
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

function _gemset() {
  local -a _actions _gemsets
  _actions=(active create delete file list version)
  _gemsets=($(rbenv gemset list | grep '^ ' | uniq))
  _arguments -s : \
    --global \
    ":action: _values actions ${_actions} ${_gemsets}" '*::arguments: _sudo'
}
compdef _gemset gemset

alias hbundle='bundle install --path vendor/bundle'
sbundle() {
  name="${1-system}"
  shift
  bundle install --path "$HOME/.gem/bundle/$name" "$@"
}
alias b='bundle exec'
alias irb='pry'
alias bi="bundle install"
alias bl="bundle list"
alias bp="bundle package"
alias bu="bundle update"

function _rails_command () {
  if [ -e "script/server" ]; then
    ruby script/$@
  elif [ -e "script/rails" ]; then
    ruby script/rails $@
  elif [ -e "bin/rails" ]; then
    bin/rails $@
  else
    rails $@
  fi
}

function _rake_command () {
  if [ -e "bin/rake" ]; then
    bin/rake $@
  else
    rake $@
  fi
}

alias rails='_rails_command'
compdef _rails_command=rails

alias rake='noglob _rake_command'
compdef _rake_command=rake

compdef _sudo z

alias zrails="z rails"
alias zrake="z rake"
alias zrspec="z rspec"

alias brake='noglob bundle exec rake' # execute the bundled rake gem
alias srake='noglob sudo rake' # noglob must come before sudo
alias sbrake='noglob sudo bundle exec rake' # altogether now ... 
