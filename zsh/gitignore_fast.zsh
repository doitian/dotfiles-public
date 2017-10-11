function gi() {
  local curcontext=:complete
  local _gitignore_list gitignore_type
  if [ -z "$1" -o "$1" = "-l" -o "$1" = "-s" ]; then
    if ! _retrieve_cache gitignore_list; then
      _gitignore_list=( $(curl -sL https://www.gitignore.io/api/list | tr "," "\n") )
      _store_cache gitignore_list _gitignore_list
    fi
    if [ "$1" = "-s" ]; then
      echo "${_gitignore_list[*]}" | tr " " "\n" | fzf -m | xargs -I % -L1 curl -sL "https://www.gitignore.io/api/%"
    else
      echo "${_gitignore_list[*]}" | tr " " "\n"
    fi
  else
    curl -sL "https://www.gitignore.io/api/$1"
  fi
}

_gitignoreio () {
  compset -P '*,'
  compadd -S '' `gi`
}

compdef _gitignoreio gi
