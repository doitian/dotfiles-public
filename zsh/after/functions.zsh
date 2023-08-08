# groot(skip = 0)
#
# Go up until .git directory found.
# @param skip skip this number of .git and continue go up
function groot() {
  local -i skip="${1:-0}"
  local cdup
  cdup="$(git rev-parse --show-cdup)"
  while ((skip > 0)); do
    cdup="$cdup/../$(git -C "$cdup/.." rev-parse --show-cdup)"
    let skip=skip-1
  done
  cd "$cdup"
}

function hs { [ -z "$1" ] && fc -l || (fc -l 1 | grep "$@"); }

function marked() {
  if [ "$1" ]; then
    open -a "Marked 2.app" "$1"
  else
    open -a "Marked 2.app"
  fi
}

function femoji() {
  if [ "$#emoji" = 0 ]; then
    source "$HOME/.oh-my-zsh/plugins/emoji/emoji.plugin.zsh"
  fi
  printf ":%s: %s\n" "${(kv)emoji[@]}" | fzf "$@"
}

function gfw() {
  case "${1:-show}" in
    show)
      command gfw
      ;;
    on|off)
      eval "$(command gfw $1)"
      echo "proxy is ${1}"
      ;;
    *)
      command gfw "$@"
      ;;
  esac
}

function vman() {
  [[ -z "${1:-}" ]] && return 1
  man "$@" | nvim '+Man!' -
}
