_cache_policy() {
  local -a oldp
  oldp=( "$1"(Nm+7) )
  (( $#oldp ))
}
zstyle ':completion::complete:*' cache-policy _cache_policy

function _tmux-fzf-session() {
  local expl
  local -a sessions
  sessions=( ${(f)"$(command tmux 2> /dev/null list-sessions -F '#S')"} )
  _arguments '-k[Kill selected sessions]' '-p[Show preview window]' "::session:{_describe 'sessions' sessions}"
}
compdef _tmux-fzf-session tmux-fzf-session

function _tmux-fzf-pane() {
  local expl
  local -a panes
  panes=( ${(f)"$(command tmux 2> /dev/null list-panes -F '#S\:#W.#P')"} )
  _arguments '-k[Kill selected panes]' '-p[Show preview window]' '-a[Show all panes in all sessions]' '-s[Show all panes in active session]' "::session:{_describe 'panes' panes}"
}
compdef _tmux-fzf-pane tmux-fzf-pane

function _tt() {
  local expl state
  local -a panes
  panes=( ${(f)"$(command tmux 2> /dev/null list-panes -F '#S:#W.#P')"} )
  _arguments \
    '-l[Send keys literally, do not recoganize keycode name]' \
    '-c[Commit, a.k.a., send a C-m at the end]' \
    "-t[Send to target, or specify where to create new pane]:panes:->panes" \
    - '(Creation Options)' \
    '-s[Send keys to new session]' \
    '-S[Send keys to new session with specified name]:session name' \
    '-n[Send keys to new window]' \
    '-N[Send keys to new window with specified name]:window name' \
    '-h[Send keys to new pane split horizontally]' \
    '-v[Send keys to new pane split vertically]' && return 0
  
  case "$state" in
    panes)
      _multi_parts : panes
  esac

  return 1
}

compdef _tt tt
