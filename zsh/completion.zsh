_cache_policy() {
  local -a oldp
  oldp=( "$1"(Nm+7) )
  (( $#oldp ))
}
zstyle ':completion::complete:*' cache-policy _cache_policy
