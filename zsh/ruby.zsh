export RBENV_SHELL=zsh

if command -v rbenv > /dev/null; then
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
fi

alias hbundle='bundle install --path vendor/bundle'
sbundle() {
  name="${1-system}"
  shift
  bundle install --path "$HOME/.gem/bundle/$name" "$@"
}
alias be='bundle exec'

alias rake="noglob rake"
alias mina="noglob mina"
