" Config file shared by vim and nvim
if exists('g:loaded_iy_public_init')
  finish
endif
let g:loaded_iy_public_init = 1

" Abbreviations {{{1
" Files {{{2
noreabbrev eefile <C-R>=expand('%')<CR>
noreabbrev eefileh <C-R>=expand('%:h')<CR>
noreabbrev eefilep <C-R>=expand('%:p')<CR>
noreabbrev eefileph <C-R>=expand('%:p:h')<CR>
noreabbrev eefilepr <C-R>=expand('%:p:r')<CR>
noreabbrev eefiler <C-R>=expand('%:r')<CR>
noreabbrev eefilet <C-R>=expand('%:t')<CR>
noreabbrev eefiletr <C-R>=expand('%:t:r')<CR>

" Date Time {{{2
noreabbrev ddate <C-R>=strftime('%Y-%m-%d')<CR>
noreabbrev dddate <C-R>=substitute(strftime('%b %d, %Y'), ' 0', ' ', '')<CR>
noreabbrev dddtime <C-R>=substitute(strftime('%b %d, %Y %I:%M %p'), ' 0', ' ', '')<CR>
noreabbrev ddtime <C-R>=strftime('%Y-%m-%d %H:%M:%S')<CR>
noreabbrev ttime <C-R>=strftime('%H:%M:%S')<CR>
noreabbrev tttime <C-R>=strftime('%I:%M %p')<CR>
noreabbrev zzettel <C-R>=strftime('%Y%m%d%H%M')<CR>

" Symbols {{{2
digraphs AH 10148

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

" Command Aliases {{{2
function! s:ExpandAlias(cmdtype, trigger, content)
  return getcmdtype() is# a:cmdtype && getcmdline() is# a:trigger ? a:content : a:trigger
endfunction

cnoreabbrev <expr> e/ <SID>ExpandAlias(':', 'e/', 'e <C-R>=expand("%:h")<CR>') " :e//
cnoreabbrev <expr> ru/ <SID>ExpandAlias(':', "ru/", "ru macros/buffer") " :ru//
cnoreabbrev <expr> mapcr <SID>ExpandAlias(':', 'mapcr', 'nnoremap <buffer> <lt>CR> <lt>Cmd>:up<lt>Bar>!<lt>CR><Left><Left><Left><Left>')
cnoreabbrev <expr> xmapcr <SID>ExpandAlias(':', 'xmapcr', 'xnoremap <buffer> <lt>CR> y<lt>Cmd>call iy#tmux#SendKeys("-l", @")<lt>CR><Left><Left><Left><Left><Left>')
cnoreabbrev <expr> xmapai <SID>ExpandAlias(':', 'xmapai', "xnoremap <buffer> <lt>CR> y<lt>Cmd>\'>put =system(['ai-chat', 'p', 'Polish'], @\\\")<lt>CR>")
cnoreabbrev <expr> ycd <SID>ExpandAlias(':', 'ycd', 'let @* = 'cd ' . shellescape(getcwd())')
cnoreabbrev <expr> y' <SID>ExpandAlias(':', "y'", "let @* = '<Left>") " :y''

if has('win32')
  cnoreabbrev <expr> cmd <SID>ExpandAlias(":", "cmd", "set shell=cmd.exe shellcmdflag=/c noshellslash guioptions-=!")
endif

let s:DisturbingFiletypes = { 'help': 1, 'netrw': 1, 'vim-': 1,
      \ 'godoc': 1, 'git': 1, 'man': 1, 'neo-tree': 1, 'aerial': 1 }
function! s:CloseDisturbingWin()
  if ((&filetype ==# '' && &diff !=# 1) || has_key(s:DisturbingFiletypes, &filetype)) && !&modified
    let l:currentWindow = winnr()
    if s:currentWindow > l:currentWindow
      let s:currentWindow = s:currentWindow - 1
    endif
    if winnr('$') ==# 1 | enew | else | close | endif
  endif
endfunction
command! Close :pclose | :cclose | :lclose |
      \ let s:currentWindow = winnr() |
      \ :windo call s:CloseDisturbingWin() |
      \ exe s:currentWindow . 'wincmd w'

" Lazy Load Commands {{{1
augroup lazyload_au
  autocmd CmdUndefined Bm packadd iy-bm.vim
  autocmd CmdUndefined DiffOrig packadd iy-diff-orig.vim
  autocmd CmdUndefined Delete,Move packadd iy-nano-fs.vim
  autocmd CmdUndefined TmuxSendKeys,TmuxSendLine,TmuxSetBuffer packadd iy-tmux.vim
  autocmd CmdUndefined VSnippets packadd fzf-vsnip
  autocmd FuncUndefined iy#tmux#SendKeys,iy#tmux#SetBuffer packadd iy-tmux.vim
  if !exists(':Explore')
    autocmd CmdUndefined Lexplore,Explore sil! unlet g:loaded_netrwPlugin | runtime plugin/netrwPlugin.vim | do FileExplorer VimEnter *
  endif
augroup END
