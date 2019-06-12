alias local-bundle='bundle install --path vendor/bundle'
function share-bundle() {
  name="${1-system}"
  shift
  bundle install --path "$HOME/.gem/bundle/$name" "$@"
}
alias be='bundle exec'

alias rake="noglob rake"
alias mina="noglob mina"
