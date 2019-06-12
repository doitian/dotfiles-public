if [ -d "$HOME/.asdf" ]; then
  export ASDF_DIR="$HOME/.asdf"
  ASDF_BIN="${ASDF_DIR}/bin"
  ASDF_USER_SHIMS="${ASDF_DIR}/shims"

  # Add function wrapper so we can export variables
  asdf() {
    local command
    command="$1"
    if [ "$#" -gt 0 ]; then
      shift
    fi

    case "$command" in
      "shell")
        # eval commands that need to export variables
        eval "$(asdf "sh-$command" "$@")";;
      *)
        # forward other commands to asdf script
        command asdf "$command" "$@";;
    esac
  }

  autoload -U bashcompinit
  bashcompinit
  source "${ASDF_DIR}/completions/asdf.bash"
fi
