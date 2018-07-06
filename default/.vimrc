if v:progname =~? "evim"
  finish
endif
set nocompatible
scriptencoding utf-8
set encoding=utf-8
set termencoding=utf-8

let loaded_matchparen = 1
let s:has_rg = executable('rg')
if has("nvim") && filereadable(expand("~/bin/python3"))
  let g:python3_host_prog = expand("~/bin/python3")
endif

" Plug {{{1
call plug#begin('~/.vim/plugged')

" filetypes
Plug 'Glench/Vim-Jinja2-Syntax'
Plug 'cespare/vim-toml'
Plug 'davidoc/taskpaper.vim'
Plug 'leafgarland/typescript-vim'
Plug 'mxw/vim-jsx'
Plug 'pangloss/vim-javascript'
Plug 'rust-lang/rust.vim'
Plug 'tomlion/vim-solidity'
Plug 'tpope/vim-markdown'
Plug 'vim-ruby/vim-ruby'

if v:version > 740
  Plug 'fatih/vim-go'
endif

" other
Plug 'editorconfig/editorconfig-vim'
Plug 'janko-m/vim-test'
Plug 'junegunn/fzf.vim'
Plug 'mkitt/tabline.vim'
Plug 'sbdchd/neoformat'
Plug 'sjl/gundo.vim' " <Leader>u
Plug 'thinca/vim-visualstar' " * # g* g#
Plug 'tommcdo/vim-exchange' " gx gX
Plug 'tomtom/tcomment_vim' " gc
Plug 'tpope/vim-abolish' " :A :S
Plug 'tpope/vim-dispatch' " <Leader>t
Plug 'tpope/vim-endwise'
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-obsession'
Plug 'tpope/vim-projectionist'
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-surround' " ys s
Plug 'tpope/vim-unimpaired' " various [, ] mappings
Plug 'w0rp/ale', { 'on': 'ALEEnable' }
Plug 'wellle/targets.vim' " Text objects

if has("gui_running") || &t_Co > 16
  Plug 'lifepillar/vim-solarized8'
endif

if has('unix')
  Plug 'tpope/vim-dotenv'
  Plug 'tpope/vim-eunuch' " linux commands
endif

if has('nvim')
  Plug 'radenling/vim-dispatch-neovim'
endif

call plug#end()

set rtp+=/usr/local/opt/fzf

" Theme {{{1
syntax on

if has("gui_running")
  if has("win32")
    set guifont=Source\ Code\ Pro\ Medium:h12
  else
    set guifont=Source\ Code\ Pro\ Medium:h16
  endif

  " Remove toolbar, left scrollbar and right scrollbar
  set go-=e go-=r go-=L go-=T
  set guicursor+=a:blinkwait2000-blinkon1500 " blink slowly
  set mousehide " Hide the mouse when typing text

  map <S-Insert> <MiddleMouse>
  map! <S-Insert> <MiddleMouse>
end

if has("gui_running") || &t_Co > 16
  if !has("gui_running")
    let g:solarized_use16 = 1
  endif
  colorscheme solarized8_dark
  set bg=dark
else
  hi! CursorLine NONE
endif

hi! link QuickFixLine Search

" Plugins Options {{{1

let g:ale_lint_on_text_changed = 'never'
let g:ale_lint_on_enter = 0
let g:ale_lint_delay = 3000
let g:ale_lint_on_filetype_changed = 0

let test#strategy = 'dispatch'

let g:netrw_banner = 0
let g:netrw_liststyle = 3

let g:go_fmt_fail_silently = 1
let g:jsx_ext_required = 0

" Functions & Commands {{{1
function! HasPaste()
  if &paste
    return '[P]'
  endif
  return ''
endfunction

function! QFixToggle()
  if &filetype == "qf"
    cclose
  else
    copen 10
  endif
endfunction

function! MyFoldText()
  let line = getline(v:foldstart)

  let nucolwidth = &fdc + &number * &numberwidth
  let windowwidth = winwidth(0) - nucolwidth - 3
  let foldedlinecount = v:foldend - v:foldstart

  " expand tabs into spaces
  let onetab = strpart('          ', 0, &tabstop)
  let line = substitute(line, '\t', onetab, 'g')

  let line = strpart(line, 0, windowwidth - 2 -len(foldedlinecount))
  let fillcharcount = windowwidth - len(line) - len(foldedlinecount) - 4
  return line . ' …' . repeat(" ",fillcharcount) . foldedlinecount . ' '
endfunction

if !exists(":DiffOrig")
  command DiffOrig vert new | set bt=nofile | r # | 0d_ | diffthis
    \ | wincmd p | diffthis
endif

let s:DisturbingFiletypes = { "help": 1, "netrw": 1, "vim-plug": 1,
      \ "godoc": 1, "git": 1, "man": 1 }

function! s:CloseDisturbingWin()
  if &filetype == "" || has_key(s:DisturbingFiletypes, &filetype)
    let l:currentWindow = winnr()
    if s:currentWindow > l:currentWindow
      let s:currentWindow = s:currentWindow - 1
    endif
    if winnr("$") == 1
      enew
    else
      close
    endif
  endif
endfunction
command! Close :pclose | :cclose | :lclose |
      \ let s:currentWindow = winnr() |
      \ :windo call s:CloseDisturbingWin() |
      \ exe s:currentWindow . "wincmd w"

command! Reload :source ~/.vimrc | :filetype detect | :nohl
command! Clear :silent! %bd | :silent! argd * | :nohl
command! -nargs=* Diff2qf :cexpr system("diff2qf", system("git diff -U0 " . <q-args>))

function! CurDir()
  if &filetype == "netrw"
    return b:netrw_curdir
  else
    return expand("%:h")
  endif
endfunction

function! PushMark(is_global)
  if a:is_global
    let l:curr = char2nr('Z')
  else
    let l:curr = char2nr('z')
  endif
  let l:until = l:curr - 25
  while l:curr > l:until
    call setpos("'" . nr2char(l:curr), getpos("'" . nr2char(l:curr - 1)))
    let l:curr -= 1
  endwhile
  call setpos("'" . nr2char(l:curr), getpos("."))
endfunction

function! s:ProjectionistActivate() abort
  let l:vars_query = projectionist#query('vars')
  if len(l:vars_query) > 0
    let l:vars = l:vars_query[0][1]
    for name in keys(l:vars)
      call setbufvar('%', name, l:vars[name])
    endfor
  endif
endfunction

command! -bang Fcd call fzf#run(fzf#wrap('Z', {'source': 'fasd -lRd', 'sink': 'cd'}, <bang>0))
command! -bang Flcd call fzf#run(fzf#wrap('Z', {'source': 'fasd -lRd', 'sink': 'lcd'}, <bang>0))
command! -bang Ftcd call fzf#run(fzf#wrap('Z', {'source': 'fasd -lRd', 'sink': 'tcd'}, <bang>0))
command! -bang Fdir call fzf#run(fzf#wrap('Z', {'source': 'fasd -lRd'}, <bang>0))
command! -bang Ffile call fzf#run(fzf#wrap('F', {'source': 'fasd -lRf'}, <bang>0))
command! -bang -nargs=* Rg
  \ call fzf#vim#grep(
  \   'rg --hidden -g "!.git" --column --line-number --no-heading --color=always '.shellescape(<q-args>), 1,
  \   <bang>0 ? fzf#vim#with_preview('up:60%')
  \           : fzf#vim#with_preview('right:50%:hidden', '?'),
  \   <bang>0)

command! -nargs=1 -complete=file Cfile set errorformat=%f\|%l\ col\ %c\|\ %m | cfile <args>

" Config {{{1

set autoindent
set autoread
set backspace=indent,eol,start
set backup
set backupdir=~/.vim/backup
set copyindent
set display+=lastline
set expandtab
set foldmethod=marker
set foldtext=MyFoldText()
set hidden
set history=3000
set hlsearch
set ignorecase
set incsearch
set laststatus=2
set lazyredraw
set mouse=a
set noerrorbells
set nofoldenable
set nojoinspaces
set noshowmode
set scrolloff=2
set sessionoptions-=options
set shiftround
set shiftwidth=2
set sidescrolloff=5
set smartcase
set smarttab
set spellfile=$HOME/.vim-spell-en.utf-8.add,.vim-spell-en.utf-8.add
set spelllang=en_us,cjk
set statusline=%<%f\ %m%r%{HasPaste()}%=%l\ %P
set switchbuf=useopen
set tabpagemax=50
set title
set undolevels=1000
set viminfo=!,'100,<2000
set virtualedit="block,insert"
set visualbell
set wildignore=*.swp,*.bak,*.pyc,*.class,*.beam
set wildmenu
set wildmode=list:longest,full
set winwidth=79

if has("cscope")
  set cscopetag
  set cscopequickfix=s-,c-,d-,i-,t-,e-
  if v:version > 740
    set cscopequickfix+=a-
  endif
endif
if v:version > 740
  set formatoptions+=1jmB
endif
if s:has_rg
  set grepformat=%f:%l:%c:%m
  set grepprg=rg\ --hidden\ -g\ '!.git'\ --vimgrep\ $*
endif
if !has("win32")
  set listchars=tab:▸\ ,trail:·,extends:>,precedes:<,nbsp:·
endif
if v:version > 740
  set undodir=~/.vim/undo,/tmp
  set undofile
endif

let $cb = $HOME . '/codebase'

runtime! macros/matchit.vim

" Keymap {{{1
" leader
let mapleader = " "
let g:mapleader = " "
let maplocalleader = "\\"
let g:maplocalleader = "\\"
set pastetoggle=<F2>

" Avoid accidental hits of <F1> while aiming for <Esc>
noremap! <F1> <Esc>

nmap <silent> [c <Plug>(ale_previous_wrap)
nmap <silent> [C <Plug>(ale_first)
nmap <silent> ]c <Plug>(ale_next_wrap)
nmap <silent> ]C <Plug>(ale_last)

nnoremap <silent> t<CR> :TestNearest<CR>

inoremap <C-u> <C-g>u<C-u>

" Complete whole filenames/lines with a quicker shortcut key in insert mode
inoremap <C-f> <C-x><C-f>

" Quick yanking to the end of the line
nnoremap Y yg_

nmap gx <Plug>(Exchange)
nmap gxx <Plug>(ExchangeLine)
nmap gX <Plug>(ExchangeClear)
vmap gx <Plug>(Exchange)

nnoremap <silent> <Leader>1 <C-w>o
nnoremap <silent> <Leader>2 <C-w>o<C-w>s<C-w>w:b#<CR><C-w>w
nnoremap <silent> <Leader>3 <C-w>o<C-w>v<C-w>w:b#<CR><C-w>w

nnoremap <Leader><Space> :Files<CR>

nnoremap <Leader>a :A<CR>

nnoremap <silent> <Leader>b :Buffers<CR>

nnoremap <Leader>cd :Fcd<CR>
nnoremap <Leader>cl :Flcd<CR>
nnoremap <Leader>ct :Ftcd<CR>
nnoremap <Leader>cT :tabnew<CR>:Ftcd<CR>
nnoremap <Leader>css :colorscheme solarized8_dark<CR>
nnoremap <Leader>csd :colorscheme default<CR>
nnoremap <silent> <Leader>cc :let @+ = @"<CR>
nnoremap <silent> <Leader>cv :let @" = @+<CR>

nnoremap <silent> <Leader>d "_d
vnoremap <silent> <Leader>d "_d

nnoremap <Leader>e/ :e <C-r>=CurDir().'/'<CR>
nnoremap <Leader>eh :e <C-r>=CurDir().'/'<CR>
nnoremap <Leader>e. :e <C-r>=CurDir().'/'<CR><CR>
nnoremap <Leader>ed :e <C-r>=CurDir().'/'<CR><CR>
nnoremap <silent> <Leader>en :enew<CR>
nnoremap <silent> <Leader>et :tabnew<CR>
nnoremap <Leader>ee :e <C-r>=expand("%")<CR>
nnoremap <silent> <Leader>ev :tabnew ~/.vimrc<CR>

nnoremap <silent> <Leader>fb :<C-u>Buffers<CR>
nnoremap <silent> <Leader>ff :<C-u>Ffile<CR>
nnoremap <silent> <Leader>fo :BLines<CR>
nnoremap <silent> <Leader>fO :Lines<CR>
nnoremap <silent> <Leader>fr :History<CR>
nnoremap <silent> <Leader>f: :History:<CR>
nnoremap <silent> <Leader>f/ :History/<CR>
nnoremap <silent> <Leader>fm :Marks<CR>
nnoremap <silent> <Leader>fw :Windows<CR>
nnoremap <silent> <Leader>f? :Helptags<CR>

nnoremap <Leader>g<Space> :grep<Space>
nnoremap <silent> <Leader>gw :silent grep "\b<cword>\b"<CR>:copen 10<CR>
nnoremap <silent> <Leader>gW :silent grep "\b<cWORD>\b"<CR>:copen 10<CR>

nnoremap <silent> <Leader>h :<C-u>Files <C-r>=CurDir()<CR><CR>

nnoremap <silent> <Leader>i :BTags<CR>
nnoremap <silent> <Leader>I :Tags<CR>

" j localmap

nnoremap <silent> <Leader>k :Close<CR>

noremap <silent> <Leader>ll :Lexplore<CR>
noremap <silent> <Leader>la :args<CR>
noremap <silent> <Leader>lj :jumps<CR>
noremap <silent> <Leader>lt :tags<CR>
noremap <silent> <Leader>lr :registers<CR>
noremap <silent> <Leader>l@ :registers<CR>
noremap <silent> <Leader>lb :ls<CR>:b<Space>
noremap <silent> <Leader>lm :marks<CR>:normal! `

nnoremap <silent> <Leader>m :call PushMark(0)<CR>
nnoremap <silent> <Leader>M :call PushMark(1)<CR>

nnoremap <silent> <Leader>n :nohlsearch<CR>

nnoremap <Leader>o<Space> :vimgrep //g %<Left><Left><Left><Left>
nnoremap <silent> <Leader>ow :silent vimgrep /\<<C-r><C-w>\>/ %<CR>:copen 10<CR>
nnoremap <silent> <Leader>oW :silent vimgrep /\<<C-r><C-a>\>/ %<CR>:copen 10<CR>

nnoremap <Leader>p "+p
nnoremap <Leader>P "+P

nnoremap <silent> <Leader>Q :cfile errors.txt<CR>
nnoremap <silent> <Leader>q :call QFixToggle()<CR>

" Reveal
nnoremap <silent> <Leader>rt :exe "silent !open -a 'Terminal.app' " . shellescape(CurDir()) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rf :exe "silent !open -R " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rm :exe "silent !open -a 'Marked 2.app' " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rM :exe "silent !open -a 'Marked 2.app' " . shellescape(CurDir()) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>ro :exe "silent !open " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nmap <silent> <Leader>rb <Plug>NetrwBrowseX

" Strip all trailing whitespace from a file
nnoremap <silent> <Leader>sw :let _s=@/<Bar>:%s/\s\+$//e<Bar>:let @/=_s<Bar>:nohl<CR>

nnoremap <Leader>tq :Copen<CR>
nnoremap <Leader>t<Space> :Start<Space>
nnoremap <Leader>tb :Start!<Space>
nnoremap <silent> <Leader>t<CR> :TestNearest<CR>
nnoremap <silent> <Leader>tf :TestFile<CR>
nnoremap <silent> <Leader>ta :TestSuite<CR>
nnoremap <silent> <Leader>tl :TestLast<CR>
nnoremap <silent> <Leader>te :TestVisit<CR>

nnoremap <Leader>u :GundoToggle<CR>
" Reselect text that was just pasted
nnoremap <Leader>v `[v`]

nnoremap <silent> <Leader>w :Neoformat<CR>:up<CR>

nnoremap <Leader>x <Nop>
nnoremap <LocalLeader>x <Nop>
nnoremap <Leader>X :nnoremap <lt>Leader>x :up\\|!
nnoremap <LocalLeader>X :nnoremap <lt>buffer> <lt>LocalLeader>x :up\\|!

nnoremap <Leader>y "+y
nnoremap <Leader>Y "+yy
vnoremap <Leader>y "+y

nnoremap <silent> <Leader>z :FZF<CR>

nnoremap <silent> <Leader>/t /\|.\{-}\|<CR>
nnoremap <silent> <Leader>/T /\<TODO\><CR>

cnoremap <C-r><C-d> <C-r>=CurDir()."/"<CR>
inoremap <C-r><C-d> <C-r>=CurDir()."/"<CR>

" Filetype specific handling {{{1
filetype indent plugin on

augroup vimrc_au
  autocmd!

  autocmd BufReadPost *
    \ if line("'\"") > 1 && line("'\"") <= line("$") && &filetype != "gitcommit" |
    \   exe "normal! g`\"" |
    \ endif

  autocmd User ProjectionistActivate call s:ProjectionistActivate()

  autocmd CmdwinEnter * map <buffer> <C-w><C-w> <CR>q:dd

  autocmd BufNewFile,BufRead *.j2 set ft=jinja
  autocmd BufNewFile,BufRead pillar.example set ft=sls
  autocmd BufNewFile,BufRead *.bats set ft=sh

  autocmd FileType gitcommit,markdown,text,rst setlocal spell textwidth=78
  autocmd FileType netrw setlocal bufhidden=wipe

  autocmd filetype markdown syntax region frontmatter start=/\%^---$/ end=/^---$/
  autocmd filetype markdown syntax region frontmattertoml start=/\%^+++$/ end=/^+++$/
  autocmd filetype markdown highlight link frontmatter Comment
  autocmd filetype markdown highlight link frontmattertoml Comment
  
  function! SetupLocalMapForGo()
    nmap <buffer> <Leader>jj :GoDeclsDir<CR>
    nmap <buffer> <Leader>ji :GoImports<CR>
    nmap <buffer> <Leader>jd :GoDoc<CR>
    nmap <buffer> <Leader>jt :GoTest<CR>
    nmap <buffer> <Leader>jaj :GoAddTags json<CR>
    nmap <buffer> <Leader>jax :GoAddTags xorm<CR>
    nmap <buffer> <Leader>i :GoDecls<CR>
  endfunction
  autocmd FileType go call SetupLocalMapForGo()
augroup END
