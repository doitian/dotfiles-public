function pattach() {
  if [[ $1 == "" ]]; then
    PERCOL=percol
  else
    PERCOL="percol --query $1"
  fi

  sessions=$(tmux ls)
  [ $? -ne 0 ] && return

  session=$(echo $sessions | eval $PERCOL | cut -d : -f 1)
  if [[ -n "$session" ]]; then
    if [ -z "$TMUX" ]; then
      tmux att -t $session
    else
      tmux switch-client -t $session
    fi
  fi
}
function ppgrep() {
  if [[ $1 == "" ]]; then
    PERCOL=percol
  else
    PERCOL="percol --query $1"
  fi
  ps aux | eval $PERCOL | awk '{ print $2 }'
}

function ppkill() {
  if [[ $1 =~ "^-" ]]; then
    QUERY=""            # options only
  else
    QUERY=$1            # with a query
    [[ $# > 0 ]] && shift
  fi
  ppgrep $QUERY | xargs kill $*
}
