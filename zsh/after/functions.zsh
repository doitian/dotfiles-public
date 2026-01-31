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

function fixauth() {
  local authenv="$(command fixauth)"
  echo "$authenv"
  echo "echo '.- sourced'"
  eval "$authenv"
}

function ycd() {
	local tmp="$(mktemp -t "yazi-cwd.XXXXXX")" cwd
	command yazi "$@" --cwd-file="$tmp"
	IFS= read -r -d '' cwd < "$tmp"
	[ "$cwd" != "$PWD" ] && [ -d "$cwd" ] && builtin cd -- "$cwd"
	rm -f -- "$tmp"
}
