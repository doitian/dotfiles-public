if exists('g:loaded_iy_opfunc')
  finish
endif
let g:loaded_iy_opfunc = 1

nnoremap <expr> <Plug>OpfuncTmuxSend iy#opfunc#wrap('iy#opfunc#tmux#Send')
xnoremap <expr> <Plug>OpfuncTmuxSendVis iy#opfunc#wrap('iy#opfunc#tmux#Send')
nnoremap <expr> <Plug>OpfuncTmuxSendLine iy#opfunc#wrap('iy#opfunc#tmux#Send') .. '_'

nnoremap <expr> <Plug>OpfuncSystemPreview iy#opfunc#wrap('iy#opfunc#system#Preview')
xnoremap <expr> <Plug>OpfuncSystemPreviewVis iy#opfunc#wrap('iy#opfunc#system#Preview')
nnoremap <expr> <Plug>OpfuncSystemPreviewLine iy#opfunc#wrap('iy#opfunc#system#Preview') .. '_'

nnoremap <expr> <Plug>OpfuncSystemPipePreview iy#opfunc#wrap('iy#opfunc#system#PipePreview')
xnoremap <expr> <Plug>OpfuncSystemPipePreviewVis iy#opfunc#wrap('iy#opfunc#system#PipePreview')
nnoremap <expr> <Plug>OpfuncSystemPipePreviewLine iy#opfunc#wrap('iy#opfunc#system#PipePreview') .. '_'

nnoremap <expr> <Plug>OpfuncSystemReplace iy#opfunc#wrap('iy#opfunc#system#Replace')
xnoremap <expr> <Plug>OpfuncSystemReplaceVis iy#opfunc#wrap('iy#opfunc#system#Replace')
nnoremap <expr> <Plug>OpfuncSystemReplaceLine iy#opfunc#wrap('iy#opfunc#system#Replace') .. '_'

nnoremap <expr> <Plug>OpfuncSystemPipeReplace iy#opfunc#wrap('iy#opfunc#system#PipeReplace')
xnoremap <expr> <Plug>OpfuncSystemPipeReplaceVis iy#opfunc#wrap('iy#opfunc#system#PipeReplace')
nnoremap <expr> <Plug>OpfuncSystemPipeReplaceLine iy#opfunc#wrap('iy#opfunc#system#PipeReplace') .. '_'

if !exists(':System')
  command -nargs=* -complete=shellcmd System call iy#opfunc#system#Preview(<q-args>)
endif

if !exists(':TmuxSend')
  command -nargs=* -complete=shellcmd TmuxSend call iy#opfunc#tmux#Send(<q-args>)
endif

if !get(g:, 'iy_opfunc_no_maps')
  nmap <Leader>$<Space> :<C-U>TmuxSend<Space>
  nmap <Leader>$  <Plug>OpfuncTmuxSend
  xmap <Leader>$  <Plug>OpfuncTmuxSendVis
  nmap <Leader>$$ <Plug>OpfuncTmuxSendLine

  nmap <Leader>!<Space> :<C-U>System<Space>
  nmap <Leader>! <Plug>OpfuncSystemPreview
  xmap <Leader>! <Plug>OpfuncSystemPreviewVis
  nmap <Leader>!! <Plug>OpfuncSystemPreviewLine

  nmap <Leader>> <Plug>OpfuncSystemPipePreview
  xmap <Leader>> <Plug>OpfuncSystemPipePreviewVis
  nmap <Leader>>> <Plug>OpfuncSystemPipePreviewLine

  nmap <Leader>% <Plug>OpfuncSystemReplace
  xmap <Leader>% <Plug>OpfuncSystemReplaceVis
  nmap <Leader>%% <Plug>OpfuncSystemReplaceLine

  nmap <Leader>< <Plug>OpfuncSystemPipeReplace
  xmap <Leader><< <Plug>OpfuncSystemPipeReplaceVis
  nmap <Leader><< <Plug>OpfuncSystemPipeReplaceLine
end
