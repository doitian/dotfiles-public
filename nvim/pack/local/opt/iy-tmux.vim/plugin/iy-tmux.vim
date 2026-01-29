if exists('g:loaded_iy_tmux')
  finish
endif
let g:loaded_iy_tmux = 1

if !exists(':TmuxSendKeys')
  command -nargs=* -complete=shellcmd TmuxSendKeys call iy#tmux#SendKeys(<f-args>)
endif

if !exists(':TmuxSendLine')
  command! -nargs=* -complete=shellcmd TmuxSendLine call iy#tmux#SendLine(<q-args>)
endif

if !exists(':TmuxSetBuffer')
  command! -nargs=* -complete=shellcmd TmuxSetBuffer call iy#tmux#SetBuffer(<q-args>)
endif

" packadd iy-tmux.vim
" xmap <Leader>y <Plug>(TmuxYank)
" nmap <Leader>y <Plug>(TmuxYank)
" xmap <Leader>Y <Plug>(TmuxYankLine)
" nmap <Leader>Y <Plug>(TmuxYankLine)
" nmap <Leader>yy <Plug>(TmuxYankLine)
xnoremap <silent> <Plug>(TmuxYank) y:call iy#tmux#SetBuffer(getreg('"'))<CR>
xnoremap <silent> <Plug>(TmuxYankLine) Y:call iy#tmux#SetBuffer(getreg('"'))<CR>
nnoremap <expr> <Plug>(TmuxYank) iy#tmux#Yank()
nnoremap <silent> <Plug>(TmuxYankLine) Y:call iy#tmux#SetBuffer(getreg('"'))<CR>
