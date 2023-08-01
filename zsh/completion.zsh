_cache_policy() {
  local -a oldp
  oldp=( "$1"(Nm+7) )
  (( $#oldp ))
}
zstyle ':completion::complete:*' cache-policy _cache_policy

if ! which _bpf_filters &> /dev/null; then
  function _bpf_filters() {
  }
fi

function _gfw() {
  local line state
  _arguments -C '1: :->cmds' '*:: :{ _normal }' && return 0
  _values "gfw command" on off
  _precommand
}
compdef _gfw gfw
compdef _precommand ts

# Custom FZF Compleitions https://github.com/junegunn/fzf#custom-fuzzy-completion
_fzf_complete_gopass() {
  _fzf_complete --prompt="gopass> " -- "$@" < <(
    gopass list -f 
  )
}
