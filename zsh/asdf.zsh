if [ -d "$HOME/.asdf" ]; then
  export ASDF_DIR="$HOME/.asdf"
  ASDF_BIN="${ASDF_DIR}/bin"
  ASDF_USER_SHIMS="${ASDF_DIR}/shims"

  asdf() {
    local command
    command="$1"
    if [ "$#" -gt 0 ]; then
      shift
    fi

    case "$command" in
    "shell")
      # commands that need to export variables
      eval "$(asdf export-shell-version sh "$@")" # asdf_allow: eval
      ;;
    *)
      # forward other commands to asdf script
      command asdf "$command" "$@"
      ;;

    esac
  }
fi
