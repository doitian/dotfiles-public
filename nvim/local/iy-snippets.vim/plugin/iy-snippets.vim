if exists('g:loaded_iy_snippets')
  finish
endif
let g:loaded_iy_snippets = 1

if !exists('g:iy_snippets_private_dir')
  let g:iy_snippets_private_dir = $HOME . "/.private-snippets.vim"
endif
if isdirectory(g:iy_snippets_private_dir)
  exec 'set rtp+='.g:iy_snippets_private_dir
  silent! runtime plugin/private-snippets.vim
endif

" Files {{{1
noreabbrev ttitle <C-r>=expand('%:t:r')<cr>
noreabbrev ffname <C-r>=expand('%:t')<cr>
noreabbrev ffpath <C-r>=expand('%')<cr>
noreabbrev fffpath <C-r>=expand('%:p')<cr>

" Date Time {{{1
noreabbrev ttime <C-r>=strftime('%H:%M:%S')<cr>
noreabbrev tttime <C-r>=strftime('%I:%M %p')<cr>
noreabbrev ddate <C-r>=strftime('%Y-%m-%d')<cr>
noreabbrev dddate <C-r>=substitute(strftime('%b %d, %Y'), ' 0', ' ', '')<cr>
noreabbrev ddtime <C-r>=strftime('%Y-%m-%d %H:%M:%S')<cr>
noreabbrev dddtime <C-r>=substitute(strftime('%b %d, %Y %I:%M %p'), ' 0', ' ', '')<cr>
noreabbrev zzettel <C-r>=strftime('%Y%m%d%H%M')<cr>

" Symbols {{{1
exec 'digraphs AH ' .. 0x27A4

noreabbrev vvah ➤
noreabbrev vveop ∎
noreabbrev vvref ※
noreabbrev vvreturn ↩︎
noreabbrev vvsec §
noreabbrev vvsharp ♯
noreabbrev vvspace ␣

noreabbrev vvbackspace ⌫
noreabbrev vvboxtl ┌──
noreabbrev vvcommand ⌘
noreabbrev vvcontrol ⌃
noreabbrev vvdelete ⌦
noreabbrev vvesc ⎋
noreabbrev vvoption ⌥
noreabbrev vvseeabove ☝
noreabbrev vvseebelow ☟
noreabbrev vvseeleft ☜
noreabbrev vvseeright ☞
noreabbrev vvshift ⇧
noreabbrev vvtab ⇥

" Command Aliases {{{1
function! s:ExpandAlias(cmdtype, trigger, content)
  return getcmdtype() is# a:cmdtype && getcmdline() is# a:trigger ? a:content : a:trigger
endfunction

cnoreabbrev <expr> mapcr <SID>ExpandAlias(":", "mapcr", "nnoremap <buffer> <lt>cr> :up<lt>bar>!<lt>cr><Left><Left><Left><Left>")
cnoreabbrev <expr> ycd <SID>ExpandAlias(":", "ycd", "let @* = 'cd ' . shellescape(getcwd())")
cnoreabbrev <expr> yf <SID>ExpandAlias(":", "yf", "let @* = expand('%')")
cnoreabbrev <expr> yp <SID>ExpandAlias(":", "yp", "let @* = expand('%:p')")
cnoreabbrev <expr> yh <SID>ExpandAlias(":", "yh", "let @* = expand('%:p:h')")
cnoreabbrev <expr> e/ <SID>ExpandAlias(":", "e/", "e <C-r>=expand('%:h')<cr>")

if has('win32')
  cnoreabbrev <expr> cmd <SID>ExpandAlias(":", "cmd", "set shell=cmd.exe shellcmdflag=/c noshellslash guioptions-=!")
endif
