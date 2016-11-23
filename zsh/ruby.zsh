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

#rbenv rehash 2>/dev/null
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
sbundle() {
  name="${1-system}"
  shift
  bundle install --path "$HOME/.gem/bundle/$name" "$@"
}
alias b='bundle exec'
alias bi="bundle install"
alias bib="bundle install --binstubs"
alias bl="bundle list"
alias bp="bundle package"
alias bu="bundle update"

alias rake="noglob rake"
alias mina="noglob mina"
