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

Plug 'Glench/Vim-Jinja2-Syntax'
Plug 'cespare/vim-toml'
Plug 'fatih/vim-go'
Plug 'leafgarland/typescript-vim'
Plug 'mxw/vim-jsx'
Plug 'pangloss/vim-javascript'
Plug 'rust-lang/rust.vim'
Plug 'tpope/vim-markdown'

Plug 'ctrlpvim/ctrlp.vim'
Plug 'editorconfig/editorconfig-vim'
Plug 'mkitt/tabline.vim'
Plug 'rizzatti/dash.vim'
Plug 'sbdchd/neoformat'
Plug 'sjl/gundo.vim' " <leader>u
Plug 'thinca/vim-visualstar' " * # g* g#
Plug 'tommcdo/vim-exchange' " gx gX
Plug 'tomtom/tcomment_vim' " gc
Plug 'tpope/vim-abolish' " :A :S
Plug 'tpope/vim-dispatch' " <leader>t
Plug 'tpope/vim-endwise'
Plug 'tpope/vim-obsession'
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-surround' " ys s
Plug 'tpope/vim-unimpaired' " various [, ] mappings
Plug 'wellle/targets.vim' " Text objects

if has("gui_running") || &t_Co > 16
  Plug 'lifepillar/vim-solarized8'
  Plug 'bling/vim-airline'
endif
if !has('win32')
  Plug 'tpope/vim-dotenv'
endif

if has('unix')
  Plug 'tpope/vim-eunuch' " linux commands
endif
if v:version >= 800
  Plug 'w0rp/ale' " ]c, [c
end

if !has('win32') && !executable('regedit.exe')
  Plug 'tpope/vim-projectionist'
  Plug 'vim-ruby/vim-ruby'
endif

if v:version > 703
  Plug 'jlanzarotta/bufexplorer' " ,lb
endif

if has('python') || has('python3')
  Plug 'FelikZ/ctrlp-py-matcher'
endif

if v:version >= 747
  Plug 'Shougo/echodoc.vim'
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

set noshowmode

let g:airline_powerline_fonts=1 "NOREMOTE
let g:airline#extensions#obsession#enabled = 1
if v:version >= 800
  let g:airline#extensions#ale#enabled = 1
end

if has("gui_running") || &t_Co > 2
  syntax on
endif
if has("gui_running") || &t_Co > 16
  if filereadable(expand("~/.vimcolor"))
    exec "colors " . readfile(expand("~/.vimcolor"))[0]
  else
    if !has("gui_running")
      let g:solarized_use16 = 1
    endif
    colors solarized8_dark
  endif
  set bg=dark
else
  hi! CursorLine NONE
endif

hi! link QuickFixLine Search

" Plugins Options {{{1
let g:netrw_banner = 0
let g:netrw_liststyle = 3

let g:bufExplorerDisableDefaultKeyMapping = 1

let g:ctrlp_root_markers = []
let g:ctrlp_switch_buffer = 'et'
let g:ctrlp_working_path_mode = 'a'
let g:ctrlp_map = '<leader><space>'
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

if v:version >= 800
  set shortmess+=c
endif
set completeopt-=preview
let g:echodoc#enable_at_startup = 1

" CtrlP auto cache clearing.
function! SetupCtrlP()
  if exists("g:loaded_ctrlp") && g:loaded_ctrlp
    augroup CtrlPExtension
      autocmd!
      autocmd FocusGained  * CtrlPClearCache
      autocmd BufWritePost * CtrlPClearCache
    augroup END
  endif
endfunction
if has("autocmd")
  autocmd VimEnter * :call SetupCtrlP()
endif

" ale
let g:ale_linters = {
  \ 'javascript': ['eslint'],
  \ 'typescript': ['tslint'],
  \ 'lua': ['luacheck', 'luac'],
  \ 'python': [ 'flake8' ],
  \ 'eruby': [ 'erubis_rails' ],
  \ }
let g:ale_lint_on_enter = 0
let g:ale_lint_delay = 3000
let g:ale_lint_on_filetype_changed = 0

let g:go_fmt_fail_silently = 1

let g:jsx_ext_required = 0

" Functions & Commands {{{1
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

function! s:CloseDisturbingWin()
  if &filetype == "help" || &filetype == "netrw" || &filetype == "vim-plug" || &filetype == "godoc" || &filetype == ""
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
set scrolloff=2
set sessionoptions-=options
set shiftround
set shiftwidth=2
set sidescrolloff=5
set smartcase
set smarttab
set spellfile=$HOME/.vim-spell-en.utf-8.add,.vim-spell-en.utf-8.add
set spelllang=en_us,cjk
set tabpagemax=50
set title
set undolevels=1000
set viminfo=!,'30,\"80
set virtualedit="block,insert"
set visualbell
set wildignore=*.swp,*.bak,*.pyc,*.class,*.beam
set wildmenu
set wildmode=list:longest,full

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

inoremap <C-U> <C-G>u<C-U>

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

nnoremap <silent> <leader>1 <C-w>o
nnoremap <silent> <leader>2 <C-w>o<C-w>s<C-w>w:b#<CR><C-w>w
nnoremap <silent> <leader>3 <C-w>o<C-w>v<C-w>w:b#<CR><C-w>w

nnoremap <leader>a :A<cr>

nnoremap <silent> <leader>b :CtrlPBuffer<CR>

nnoremap <silent> <leader>cd :cd <C-R>=CurDir()<CR><CR>
nnoremap <silent> <leader>lcd :lcd <C-R>=CurDir()<CR><CR>
nnoremap <silent> <leader>tcd :tcd <C-R>=CurDir()<CR><CR>

" Use ,d (or ,dd or ,dj or 20,dd) to delete a line without adding it to the
" yanked stack (also, in visual mode)
nnoremap <silent> <leader>d "_d
vnoremap <silent> <leader>d "_d

nnoremap <leader>e/ :e <C-R>=CurDir().'/'<cr>
nnoremap <leader>eh :e <C-R>=CurDir().'/'<cr>
nnoremap <leader>e. :e <C-R>=CurDir().'/'<cr><cr>
nnoremap <leader>ed :e <C-R>=CurDir().'/'<cr><cr>
nnoremap <silent> <leader>en :enew<cr>
nnoremap <leader>ee :e <C-R>=expand("%")<cr>
nnoremap <silent> <leader>ev :tabnew ~/.vimrc<cr>

nnoremap <silent> <leader>F :CtrlPClearAllCaches\|:CtrlP<cr>
nnoremap <silent> <leader>fb :CtrlPBuffer<CR>
nnoremap <silent> <leader>fd :CtrlPDir<CR>
nnoremap <silent> <leader>ff :Ffile<CR>
nnoremap <silent> <leader>fh :CtrlPCurFile<CR>
nnoremap <silent> <leader>fe :CtrlPQuickfix<CR>
nnoremap <silent> <leader>fo :CtrlPLine<CR>
nnoremap <silent> <leader>fr :CtrlPMRUFiles<CR>
nnoremap <silent> <leader>ft :CtrlPTag<CR>
nnoremap <silent> <leader>fg :CtrlPMixed<CR>
nnoremap <silent> <leader>fc :CtrlPChange<CR>
nnoremap <silent> <leader>fC :CtrlPChangeAll<CR>
nnoremap <silent> <leader>fB :CtrlPBookmarkDir<CR>

nnoremap <leader>A :grep<space>
nnoremap <leader>gaa :grep<space>
nnoremap <silent> <leader>gaw :grep "\b<cword>\b"<cr>
nnoremap <silent> <leader>gaW :grep "\b<cWORD>\b"<cr>
nnoremap <leader>O :vimgrep //g %<Left><Left><Left>
nnoremap <leader>goo :vimgrep //g %<Left><Left><Left>
nnoremap <silent> <leader>gow :vimgrep /\<<C-R><C-w>\>/ %<cr>
nnoremap <silent> <leader>goW :vimgrep /\<<C-R><C-a>\>/ %<cr>

nnoremap <leader>gc :Fcd<cr>
nnoremap <leader>gl :Flcd<cr>
nnoremap <leader>gt :Ftcd<cr>

nnoremap <silent> <leader>H :Dash<space>
nnoremap <silent> <leader>h :Dash<CR>

nnoremap <silent> <leader>i :CtrlPBufTag<CR>
nnoremap <silent> <leader>I :CtrlPBufTagAll<CR>

" j localmap

nnoremap <silent> <leader>k :Close<CR>

noremap <silent> <leader>ll :Lexplore<CR>
noremap <silent> <leader>lt :tags<CR>
noremap <silent> <leader>lm :marks<cr>
noremap <silent> <leader>lr :registers<cr>
noremap <silent> <leader>l@ :registers<cr>
noremap <silent> <leader>lbe :BufExplorer<CR>
noremap <silent> <leader>lbt :ToggleBufExplorer<CR>
noremap <silent> <leader>lbb :ToggleBufExplorer<CR>
noremap <silent> <leader>lbl :ls<CR>
noremap <silent> <leader>lbs :BufExplorerHorizontalSplit<CR>
noremap <silent> <leader>lbv :BufExplorerVerticalSplit<CR>

nnoremap <silent> <leader>m :Make<CR>
nnoremap <silent> <leader>M :Make!<CR>

nnoremap <silent> <leader>n :nohlsearch<CR>

nnoremap <silent> <leader>ot :exe "silent !open -a 'Terminal.app' " . shellescape(CurDir()) . " &> /dev/null" \| :redraw!<cr>
nnoremap <silent> <leader>of :exe "silent !open -R " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<cr>
nnoremap <silent> <leader>om :exe "silent !open -a 'Marked 2.app' " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<cr>
nnoremap <silent> <leader>oM :exe "silent !open -a 'Marked 2.app' " . shellescape(CurDir()) . " &> /dev/null" \| :redraw!<cr>
nnoremap <silent> <leader>oo :exe "silent !open " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<cr>
nmap <silent> <leader>ob <Plug>NetrwBrowseX

nnoremap <leader>p "+p
nnoremap <leader>P "+P

" Tame the quickfix window (open/close using ,q)
nnoremap <silent> <leader>Q :QFix<CR>
nnoremap <silent> <leader>q :CtrlPQuickfix<CR>

" r unused
nnoremap <silent> <leader>r :Ffile<CR>

" Strip all trailing whitespace from a file
nnoremap <silent> <leader>sw :let _s=@/<Bar>:%s/\s\+$//e<Bar>:let @/=_s<Bar>:nohl<cr>

nnoremap <leader>to :Copen<cr>
nnoremap <leader>td :Dispatch<space>
nnoremap <leader>tD :Dispatch!<space>
nnoremap <leader>tt :Dispatch<cr>
nnoremap <leader>tT :Dispatch!<cr>
nnoremap <leader>ts :Start<space>
nnoremap <leader>tb :Start!<space>
nnoremap <leader>tf :Focus<space>

nnoremap <leader>u :GundoToggle<CR>
" Reselect text that was just pasted
nnoremap <leader>v `[v`]

nnoremap <silent> <leader>w :Neoformat<cr>:up<cr>

nnoremap <leader>X :nnoremap <lt>leader>x :up\\|!<Up>

nnoremap <leader>y "+y
nnoremap <leader>Y "+yy
vnoremap <leader>y "+y

nnoremap <silent> <leader>z :FZF<CR>

nnoremap <silent> <leader>/t /\|.\{-}\|<CR>

cnoremap <C-r><C-d> <C-r>=CurDir()."/"<cr>
inoremap <C-r><C-d> <C-r>=CurDir()."/"<cr>

" Filetype specific handling {{{1
filetype indent plugin on
augroup restore_position
  au!
  autocmd FileType text setlocal textwidth=78
  autocmd BufReadPost *
    \ if line("'\"") > 1 && line("'\"") <= line("$") && &filetype != "gitcommit" |
    \   exe "normal! g`\"" |
    \ endif
augroup END

augroup mardown_ft
  au!

  autocmd filetype markdown syntax region frontmatter start=/\%^---$/ end=/^---$/
  autocmd filetype markdown syntax region frontmattertoml start=/\%^+++$/ end=/^+++$/
  autocmd filetype markdown highlight link frontmatter Comment
  autocmd filetype markdown highlight link frontmattertoml Comment
augroup end

augroup jinjia2_ft
  au!

  autocmd BufNewFile,BufRead *.j2 set ft=jinja
augroup END

augroup sls_ft
  au!

  autocmd BufNewFile,BufRead pillar.example set ft=sls
augroup END

augroup bats_ft
  au!

  autocmd BufNewFile,BufRead *.bats set ft=sh
augroup END


augroup spell_ft
  au!
  autocmd FileType gitcommit,markdown,text,rst setlocal spell
augroup END

function! SetupLocalMapForGo()
  nmap <buffer> <leader>jj :GoDeclsDir<cr>
  nmap <buffer> <leader>ji :GoImports<cr>
  nmap <buffer> <leader>jd :GoDoc<cr>
  nmap <buffer> <leader>jt :GoTest<cr>
  nmap <buffer> <leader>jaj :GoAddTags json<cr>
  nmap <buffer> <leader>jax :GoAddTags xorm<cr>
  nmap <buffer> <leader>i :GoDecls<cr>
endfunction

augroup go_ft
  au!
  au FileType go call SetupLocalMapForGo()
augroup END

augroup rust_ft
  au!
  au BufRead *.rs :setlocal tags=./rusty-tags.vi;/
augroup END

autocmd FileType netrw setl bufhidden=wipe

