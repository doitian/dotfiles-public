if exists('g:loaded_iy_snippets')
  finish
endif
let g:loaded_iy_snippets = 1

if !exists('g:iy_snippets_private_dir')
  let g:iy_snippets_private_dir = $HOME . "/.private-snippets.vim"
endif
if isdirectory(g:iy_snippets_private_dir)
  exec 'set rtp+='.g:iy_snippets_private_dir
  runtime! plugin/private-snippets.vim
endif

" Files {{{1
noreabbrev ttitle <C-R>=expand('%:t:r')<CR>
noreabbrev ffname <C-R>=expand('%:t')<CR>
noreabbrev ffpath <C-R>=expand('%')<CR>
noreabbrev fffpath <C-R>=expand('%:p')<CR>

" Date Time {{{1
noreabbrev ttime <C-R>=strftime('%H:%M:%S')<CR>
noreabbrev tttime <C-R>=strftime('%I:%M %p')<CR>
noreabbrev ddate <C-R>=strftime('%Y-%m-%d')<CR>
noreabbrev dddate <C-R>=substitute(strftime('%b %d, %Y'), ' 0', ' ', '')<CR>
noreabbrev ddtime <C-R>=strftime('%Y-%m-%d %H:%M:%S')<CR>
noreabbrev dddtime <C-R>=substitute(strftime('%b %d, %Y %I:%M %p'), ' 0', ' ', '')<CR>
noreabbrev zzettel <C-R>=strftime('%Y%m%d%H%M')<CR>

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

cnoreabbrev <expr> mapcr <SID>ExpandAlias(":", "mapcr", "nnoremap <buffer> <lt>CR> :up<lt>Bar>!<lt>CR><Left><Left><Left><Left>")
cnoreabbrev <expr> ycd <SID>ExpandAlias(":", "ycd", "let @* = 'cd ' . shellescape(getcwd())")
cnoreabbrev <expr> yf <SID>ExpandAlias(":", "yf", "let @* = expand('%')")
cnoreabbrev <expr> yp <SID>ExpandAlias(":", "yp", "let @* = expand('%:p')")
cnoreabbrev <expr> yh <SID>ExpandAlias(":", "yh", "let @* = expand('%:p:h')")
cnoreabbrev <expr> e/ <SID>ExpandAlias(":", "e/", "e <C-R>=expand('%:h')<CR>")

if has('win32')
  cnoreabbrev <expr> cmd <SID>ExpandAlias(":", "cmd", "set shell=cmd.exe shellcmdflag=/c noshellslash guioptions-=!")
endif
