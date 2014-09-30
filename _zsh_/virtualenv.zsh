#!/bin/bash
wrapsource=`which virtualenvwrapper_lazy.sh`

if [ -f "$wrapsource" ]; then
  source $wrapsource

  function workon_cwd {
    # Check that this is a Git repo
    typeset PROJECT_ROOT="$(git rev-parse --show-toplevel 2> /dev/null)"
    typeset ENV_NAME=
    typeset ENV_ACTIVATE=
    if (( $? == 0 )); then
      # Check for virtualenv name override
      ENV_NAME=$(basename "$PROJECT_ROOT")
      if [ -f "$PROJECT_ROOT/.venv" ]; then
        ENV_NAME=$(cat "$PROJECT_ROOT/.venv")
      fi
      # Activate the environment only if it is not already active
      if [ -n "$ENV_NAME" ]; then
        if [ "$VIRTUAL_ENV" != "$WORKON_HOME/$ENV_NAME" ]; then
          if [ -e "$WORKON_HOME/$ENV_NAME/bin/activate" ]; then
            export VIRTUAL_ENV_DISABLE_PROMPT=1
            ENV_ACTIVATE=1
            workon "$ENV_NAME" && export CD_VIRTUAL_ENV="$ENV_NAME"
          fi
        else
          ENV_ACTIVATE=1
          export CD_VIRTUAL_ENV="$ENV_NAME"
        fi
      fi
    fi

    if [ -z "$ENV_ACTIVATE" ] && [ -n "$CD_VIRTUAL_ENV" ]; then
      deactivate && unset CD_VIRTUAL_ENV
    fi
  }

  export PROMPT_COMMAND=workon_cwd
  if [ -n "$ZSH_VERSION" ]; then
    function chpwd() {
      workon_cwd
    }
  fi
fi
