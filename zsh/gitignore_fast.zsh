function gi() {
  local curcontext=:complete
  local _gitignore_list gitignore_type
  if [ -z "$1" -o "$1" = "list" ]; then
    if ! _retrieve_cache gitignore_list; then
      _gitignore_list=( $(curl -sL https://www.gitignore.io/api/list | tr "," "\n") )
      _store_cache gitignore_list _gitignore_list
    fi
    echo "${_gitignore_list[*]}" | tr " " "\n"
  else
    curl -sL https://www.gitignore.io/api/$@
  fi
}

_gitignoreio () {
  compset -P '*,'
  compadd -S '' `gi`
}

compdef _gitignoreio gi
