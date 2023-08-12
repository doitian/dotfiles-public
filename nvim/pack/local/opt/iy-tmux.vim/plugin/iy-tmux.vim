if exists('g:loaded_iy_tmux')
  finish
endif
let g:loaded_iy_tmux = 1

if !exists(':TmuxSendKeys')
  command -nargs=* -complete=shellcmd TmuxSendKeys call iy#tmux#SendKeys(<f-args>)
endif

if !exists(':TmuxSendLine')
  command! -nargs=* -complete=shellcmd TmuxSendLine call iy#tmux#SendKeys('-l', <q-args>."\n")
endif
