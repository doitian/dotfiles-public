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

compdef _precommand ts

autoload -Uz _fzf_complete_gopass
