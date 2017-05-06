BEFORE_PATH=
if [ -d "$VIRTUAL_ENV" ]; then
  AFTER_PATH="${PATH#*"$VIRTUAL_ENV/bin:"}"
  if [ ${#AFTER_PATH} != ${#PATH} ]; then
    BEFORE_PATH="${PATH%%"$VIRTUAL_ENV/bin:"*}"
  fi

  PATH="$BEFORE_PATH$AFTER_PATH"
  BEFORE_PATH="$VIRTUAL_ENV/bin:"
fi
if [ -n "$CONDA_DEFAULT_ENV" -a -z "$CONDA_PREFIX" ]; then
  export CONDA_PREFIX="$HOME/.anaconda3/envs/$CONDA_DEFAULT_ENV"
fi
if [ -d "$CONDA_PREFIX" ]; then
  AFTER_PATH="${PATH#*"$CONDA_PREFIX/bin:"}"
  if [ ${#AFTER_PATH} != ${#PATH} ]; then
    BEFORE_PATH="${PATH%%"$CONDA_PREFIX/bin:"*}"
  fi

  PATH="$BEFORE_PATH$AFTER_PATH"
  BEFORE_PATH="$CONDA_PREFIX/bin:$BEFORE_PATH"
fi
export PATH="${BEFORE_PATH}$(echo "$PATH" | sed 's;^\(.*\):\.git\(.*\):/PATH:;.git\2:/PATH:\1:;')"
unset BEFORE_PATH AFTER_PATH
