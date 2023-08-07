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
noreabbrev eefile <C-R>=expand('%')<CR>
noreabbrev eefileh <C-R>=expand('%:h')<CR>
noreabbrev eefilep <C-R>=expand('%:p')<CR>
noreabbrev eefileph <C-R>=expand('%:p:h')<CR>
noreabbrev eefilepr <C-R>=expand('%:p:r')<CR>
noreabbrev eefiler <C-R>=expand('%:r')<CR>
noreabbrev eefilet <C-R>=expand('%:t')<CR>
noreabbrev eefiletr <C-R>=expand('%:t:r')<CR>

" Date Time {{{1
noreabbrev ddate <C-R>=strftime('%Y-%m-%d')<CR>
noreabbrev dddate <C-R>=substitute(strftime('%b %d, %Y'), ' 0', ' ', '')<CR>
noreabbrev dddtime <C-R>=substitute(strftime('%b %d, %Y %I:%M %p'), ' 0', ' ', '')<CR>
noreabbrev ddtime <C-R>=strftime('%Y-%m-%d %H:%M:%S')<CR>
noreabbrev ttime <C-R>=strftime('%H:%M:%S')<CR>
noreabbrev tttime <C-R>=strftime('%I:%M %p')<CR>
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

cnoreabbrev <expr> e/ <SID>ExpandAlias(":", "e/", "e <C-R>=expand('%:h')<CR>") " :e//
cnoreabbrev <expr> mapcr <SID>ExpandAlias(":", "mapcr", "nnoremap <buffer> <lt>CR> :up<lt>Bar>!<lt>CR><Left><Left><Left><Left>")
cnoreabbrev <expr> ycd <SID>ExpandAlias(":", "ycd", "let @* = 'cd ' . shellescape(getcwd())")
cnoreabbrev <expr> y' <SID>ExpandAlias(":", "y'", "let @* = '<Left>") " :y''

if has('win32')
  cnoreabbrev <expr> cmd <SID>ExpandAlias(":", "cmd", "set shell=cmd.exe shellcmdflag=/c noshellslash guioptions-=!")
endif
