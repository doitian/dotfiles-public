BEFORE_PATH=
if [ -d "$VIRTUAL_ENV" ]; then
  AFTER_PATH="${PATH#*"$VIRTUAL_ENV/bin:"}"
  if [ ${#AFTER_PATH} != ${#PATH} ]; then
    BEFORE_PATH="${PATH%%"$VIRTUAL_ENV/bin:"*}"
  fi

  PATH="$BEFORE_PATH$AFTER_PATH"
  BEFORE_PATH="$VIRTUAL_ENV/bin:"
fi
export PATH="${BEFORE_PATH}$(echo "$PATH" | sed 's;^\(.*\):\.git\(.*\):/PATH:;.git\2:/PATH:\1:;')"
unset BEFORE_PATH AFTER_PATH

export PATH="$HOME/.cargo/bin:$PATH"
