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

if !exists(':TmuxSetBuffer')
  command! -nargs=* -complete=shellcmd TmuxSetBuffer call iy#tmux#SetBuffer(<q-args>)
endif

" packadd iy-tmux.vim
" xmap <Leader>y <Plug>(TmuxYank)
xnoremap <silent> <Plug>(TmuxYank) y:call iy#tmux#SetBuffer(getreg('"'))<CR>
