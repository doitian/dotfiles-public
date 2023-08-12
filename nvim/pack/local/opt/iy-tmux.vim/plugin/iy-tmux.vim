if exists('g:loaded_iy_tmux')
  finish
endif
let g:loaded_iy_tmux = 1

if !exists(':TmuxSend')
  command -nargs=* -complete=shellcmd TmuxSend call iy#tmux#Send(<q-args>)
endif
