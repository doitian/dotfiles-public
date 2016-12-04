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
