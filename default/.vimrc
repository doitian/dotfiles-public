if v:progname =~? "evim"
  finish
endif
set nocompatible
scriptencoding utf-8
set encoding=utf-8
set termencoding=utf-8

let loaded_matchparen = 1
let s:has_ag = executable('ag')
if has("nvim") && filereadable(expand("~/bin/python3"))
  let g:python3_host_prog = expand("~/bin/python3")
endif

" Plug {{{1
call plug#begin('~/.vim/plugged')

" filetypes
Plug 'Glench/Vim-Jinja2-Syntax'
Plug 'cespare/vim-toml'
Plug 'fatih/vim-go'
Plug 'leafgarland/typescript-vim'
Plug 'mxw/vim-jsx'
Plug 'pangloss/vim-javascript'
Plug 'rust-lang/rust.vim'
Plug 'tpope/vim-markdown'
Plug 'vim-ruby/vim-ruby'

" other
Plug 'ctrlpvim/ctrlp.vim'
Plug 'editorconfig/editorconfig-vim'
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
Plug 'wellle/targets.vim' " Text objects

if has("gui_running") || &t_Co > 16
  Plug 'lifepillar/vim-solarized8'
endif

if has('unix')
  Plug 'tpope/vim-dotenv'
  Plug 'tpope/vim-eunuch' " linux commands
endif

if has('python') || has('python3')
  Plug 'FelikZ/ctrlp-py-matcher'
endif

call plug#end()

set rtp+=/usr/local/opt/fzf

" Theme {{{1
if has("gui_running")
  if has("win32")
    set guifont=Source\ Code\ Pro\ Medium:h12
  else
    set guifont=Source\ Code\ Pro\ Medium:h16
  endif

  " Remove toolbar, left scrollbar and right scrollbar
  set guioptions-=TlLrR
  set guicursor+=a:blinkwait2000-blinkon1500 " blink slowly
  set mousehide		" Hide the mouse when typing text

  map <S-Insert> <MiddleMouse>
  map! <S-Insert> <MiddleMouse>
endif

if has("gui_running") || &t_Co > 2
  syntax on
endif
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

let g:ctrlp_root_markers = []
let g:ctrlp_switch_buffer = 'et'
let g:ctrlp_working_path_mode = 'a'
let g:ctrlp_map = '<Leader><Space>'
if s:has_ag
  let ctrlp_user_command_ag = 'ag %s -l --nocolor -g ""'
  if executable('regedit.exe')
    let ctrlp_user_command_ag = 'ag -l --nocolor -g "" "." "%s"'
  endif
  let g:ctrlp_user_command = {
    \ 'types': {
      \ 1: ['.ctrlp_user_command_is_git', 'git -C %s ls-files --exclude-standard --others --cached'],
      \ },
    \ 'fallback': ctrlp_user_command_ag
    \ }
else
  let g:ctrlp_user_command = ['.git', 'git -C %s ls-files --exclude-standard --others --cached']
endif
let g:ctrlp_custom_ignore = {
  \ 'dir':  '\v[\/](\.(git|hg|svn)|_build)$',
  \ 'file': '\v\.(meta)$',
  \ }
let g:ctrlp_buftag_types = {
  \ 'yaml'     : '--languages=ansible --ansible-types=k',
  \ }
if has('python') || has('python3')
  let g:ctrlp_match_func = { 'match': 'pymatcher#PyMatch' }
endif

function! SetupCtrlP()
  if exists("g:loaded_ctrlp") && g:loaded_ctrlp
    augroup ctrlp_au
      autocmd!
      autocmd FocusGained  * CtrlPClearCache
      autocmd BufWritePost * CtrlPClearCache
    augroup END
  endif
endfunction
if !exists("g:loaded_ctrlp") || !g:loaded_ctrlp
  autocmd VimEnter * :call SetupCtrlP()
endif

let g:netrw_banner = 0
let g:netrw_liststyle = 3

let g:go_fmt_fail_silently = 1
let g:jsx_ext_required = 0

" Functions & Commands {{{1
function! HasPaste()
    if &paste
        return '[P]'
    en
    return ''
endfunction

command! -bang -nargs=? QFix call QFixToggle(<bang>0)
function! QFixToggle(forced)
  if exists("g:qfix_win") && a:forced == 0
    cclose
    unlet g:qfix_win
  else
    copen 10
    let g:qfix_win = bufnr("$")
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

let s:DisturbingFiletypes = { "": 1, "help": 1, "netrw": 1, "vim-plug": 1,
      \ "godoc": 1, "git": 1, "man": 1 }

function! s:CloseDisturbingWin()
  if has_key(s:DisturbingFiletypes, &filetype)
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
command! Clear :CtrlPClearCache | :silent! %bd | :silent! argd * | :nohl
command! -nargs=* Diff2qf :cexpr system("diff2qf", system("git diff -U0 " . <q-args>))

function! CurDir()
  if &filetype == "netrw"
    return b:netrw_curdir
  else
    return expand("%:h")
  endif
endfunction

command! -bang Fcd call fzf#run(fzf#wrap('Z', {'source': 'fasd -lRd', 'sink': 'cd'}, <bang>0))
command! -bang Flcd call fzf#run(fzf#wrap('Z', {'source': 'fasd -lRd', 'sink': 'lcd'}, <bang>0))
command! -bang Ftcd call fzf#run(fzf#wrap('Z', {'source': 'fasd -lRd', 'sink': 'tcd'}, <bang>0))
command! -bang Fdir call fzf#run(fzf#wrap('Z', {'source': 'fasd -lRd'}, <bang>0))
command! -bang Ffile call fzf#run(fzf#wrap('F', {'source': 'fasd -lRf'}, <bang>0))

" Config {{{1

set autoindent
set autoread
set backspace=indent,eol,start
set backup
set backupdir=~/.vim/backup
set copyindent
set display+=lastline
set expandtab
set foldlevelstart=0
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
set tabpagemax=50
set title
set undolevels=1000
set viminfo=!,'100,<2000
set virtualedit="block,insert"
set visualbell
set wildignore=*.swp,*.bak,*.pyc,*.class,*.beam
set wildmenu
set wildmode=list:longest,full

if has("cscope")
  set cscopetag
  set cscopequickfix=s-,c-,d-,i-,t-,e-,a-
endif
if v:version > 703
  set formatoptions+=1jmB
endif
if s:has_ag
  set grepformat=%f:%l:%c:%m
  set grepprg=ag\ --vimgrep\ $*
endif
if !has("win32")
  set listchars=tab:▸\ ,trail:·,extends:>,precedes:<,nbsp:·
endif
if v:version >= 730
  set undodir=~/.vim/.undo,/tmp
  set undofile
endif
if v:version >= 800
  set shortmess+=c
endif

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

inoremap <C-u> <C-g>u<C-u>

" Use Q for formatting the current paragraph (or visual selection)
vnoremap Q gq
nnoremap Q gqap

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

nnoremap <Leader>a :A<CR>

nnoremap <silent> <Leader>b :CtrlPBuffer<CR>

nnoremap <silent> <Leader>cd :cd <C-r>=CurDir()<CR><CR>
nnoremap <silent> <Leader>lcd :lcd <C-r>=CurDir()<CR><CR>
nnoremap <silent> <Leader>tcd :tcd <C-r>=CurDir()<CR><CR>

" Use ,d (or ,dd or ,dj or 20,dd) to delete a line without adding it to the
" yanked stack (also, in visual mode)
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

nnoremap <silent> <Leader>F :CtrlPClearAllCaches\|:CtrlP<CR>
nnoremap <silent> <Leader>fb :CtrlPBuffer<CR>
nnoremap <silent> <Leader>fd :CtrlPDir<CR>
nnoremap <silent> <Leader>ff :Ffile<CR>
nnoremap <silent> <Leader>fh :CtrlPCurFile<CR>
nnoremap <silent> <Leader>fq :CtrlPQuickfix<CR>
nnoremap <silent> <Leader>fo :CtrlPLine<CR>
nnoremap <silent> <Leader>fr :CtrlPMRUFiles<CR>
nnoremap <silent> <Leader>ft :CtrlPTag<CR>
nnoremap <silent> <Leader>fg :CtrlPMixed<CR>
nnoremap <silent> <Leader>fc :CtrlPChange<CR>
nnoremap <silent> <Leader>fC :CtrlPChangeAll<CR>

nnoremap <Leader>A :grep<Space>
nnoremap <Leader>gaa :grep<Space>
nnoremap <silent> <Leader>gaw :grep "\b<cword>\b"<CR>
nnoremap <silent> <Leader>gaW :grep "\b<cWORD>\b"<CR>
nnoremap <Leader>O :vimgrep //g %<Left><Left><Left>
nnoremap <Leader>goo :vimgrep //g %<Left><Left><Left><Left>
nnoremap <silent> <Leader>gow :vimgrep /\<<C-r><C-w>\>/ %<CR>
nnoremap <silent> <Leader>goW :vimgrep /\<<C-r><C-a>\>/ %<CR>

nnoremap <Leader>gc :Fcd<CR>
nnoremap <Leader>gl :Flcd<CR>
nnoremap <Leader>gt :Ftcd<CR>

" h unused

nnoremap <silent> <Leader>i :CtrlPBufTag<CR>
nnoremap <silent> <Leader>I :CtrlPBufTagAll<CR>

" j localmap

nnoremap <silent> <Leader>k :Close<CR>

noremap <silent> <Leader>ll :Lexplore<CR>
noremap <silent> <Leader>lt :tags<CR>
noremap <silent> <Leader>lr :registers<CR>
noremap <silent> <Leader>l@ :registers<CR>
noremap <silent> <Leader>lb :ls<CR>:b<Space>
noremap <silent> <Leader>lm :marks<CR>:normal! `
noremap <silent> <Leader>lu :undolist<CR>:u<space>

nnoremap <silent> <Leader>m :Make<CR>

nnoremap <silent> <Leader>n :nohlsearch<CR>

nnoremap <silent> <Leader>ot :exe "silent !open -a 'Terminal.app' " . shellescape(CurDir()) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>of :exe "silent !open -R " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>om :exe "silent !open -a 'Marked 2.app' " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>oM :exe "silent !open -a 'Marked 2.app' " . shellescape(CurDir()) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>oo :exe "silent !open " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nmap <silent> <Leader>ob <Plug>NetrwBrowseX

nnoremap <Leader>p "+p
nnoremap <Leader>P "+P

" Tame the quickfix window (open/close using ,q)
nnoremap <silent> <Leader>Q :cfile errors.txt<CR>
nnoremap <silent> <Leader>q :QFix<CR>

nnoremap <silent> <Leader>r :Ffile<CR>

" Strip all trailing whitespace from a file
nnoremap <silent> <Leader>sw :let _s=@/<Bar>:%s/\s\+$//e<Bar>:let @/=_s<Bar>:nohl<CR>

nnoremap <silent> <Leader>tm :Make!<CR>
nnoremap <Leader>to :Copen<CR>
nnoremap <Leader>tf :Focus<Space>
nnoremap <Leader>td :Dispatch<Space>
nnoremap <Leader>tk :Dispatch!<Space>
nnoremap <Leader>tt :Dispatch<CR>
nnoremap <Leader>ty :Dispatch!<CR>
nnoremap <Leader>ts :Start<Space>
nnoremap <Leader>tl :Start!<Space>

nnoremap <Leader>u :GundoToggle<CR>
" Reselect text that was just pasted
nnoremap <Leader>v `[v`]

nnoremap <silent> <Leader>w :Neoformat<CR>:up<CR>

nnoremap <Leader>X :nnoremap <lt>Leader>x :up\\|!

nnoremap <Leader>y "+y
nnoremap <Leader>Y "+yy
vnoremap <Leader>y "+y

nnoremap <silent> <Leader>z :FZF<CR>

nnoremap <silent> <Leader>/t /\|.\{-}\|<CR>

cnoremap <C-r><C-d> <C-r>=CurDir()."/"<CR>
inoremap <C-r><C-d> <C-r>=CurDir()."/"<CR>

" Filetype specific handling {{{1
filetype indent plugin on
augroup restore_position_au
  autocmd!
  autocmd BufReadPost *
    \ if line("'\"") > 1 && line("'\"") <= line("$") && &filetype != "gitcommit" |
    \   exe "normal! g`\"" |
    \ endif
augroup END

augroup cmd_win_au
  autocmd!
  autocmd CmdwinEnter * map <buffer> <C-w><C-w> <CR>q:dd
augroup END

augroup mardown_au
  autocmd!
  autocmd filetype markdown syntax region frontmatter start=/\%^---$/ end=/^---$/
  autocmd filetype markdown syntax region frontmattertoml start=/\%^+++$/ end=/^+++$/
  autocmd filetype markdown highlight link frontmatter Comment
  autocmd filetype markdown highlight link frontmattertoml Comment
augroup END

augroup jinjia2_au
  autocmd!
  autocmd BufNewFile,BufRead *.j2 set ft=jinja
augroup END

augroup sls_au
  autocmd!
  autocmd BufNewFile,BufRead pillar.example set ft=sls
augroup END

augroup bats_au
  autocmd!
  autocmd BufNewFile,BufRead *.bats set ft=sh
augroup END

augroup spell_au
  autocmd!
  autocmd FileType gitcommit,markdown,text,rst setlocal spell
augroup END

augroup go_au
  function! SetupLocalMapForGo()
    nmap <buffer> <Leader>jj :GoDeclsDir<CR>
    nmap <buffer> <Leader>ji :GoImports<CR>
    nmap <buffer> <Leader>jd :GoDoc<CR>
    nmap <buffer> <Leader>jt :GoTest<CR>
    nmap <buffer> <Leader>jaj :GoAddTags json<CR>
    nmap <buffer> <Leader>jax :GoAddTags xorm<CR>
    nmap <buffer> <Leader>i :GoDecls<CR>
  endfunction

  autocmd!
  autocmd FileType go call SetupLocalMapForGo()
augroup END

augroup rust_au
  autocmd!
  autocmd BufRead *.rs :setlocal tags=./rusty-tags.vi;/
augroup END

augroup netrw_au
  autocmd!
  autocmd FileType netrw setl bufhidden=wipe
augroup END
