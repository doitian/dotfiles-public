if v:progname =~? "evim"
  finish
endif
set nocompatible
scriptencoding utf-8
set encoding=utf-8

let loaded_matchparen = 1
let s:has_ag = executable('ag')
if has("nvim") && filereadable(expand("~/bin/python3"))
  let g:python3_host_prog = expand("~/bin/python3")
endif
let s:use_colorscheme = !filereadable(expand("~/.vim_no_colorscheme"))
\ && (has("gui_running") || &t_Co > 16)

" Plug {{{1
call plug#begin('~/.vim/plugged')

Plug 'Glench/Vim-Jinja2-Syntax'
Plug 'cespare/vim-toml'
Plug 'fatih/vim-go'
Plug 'leafgarland/typescript-vim'
Plug 'mxw/vim-jsx'
Plug 'pangloss/vim-javascript'
Plug 'rust-lang/rust.vim'
Plug 'saltstack/salt-vim'
Plug 'tpope/vim-markdown'

Plug 'amiorin/ctrlp-z'
Plug 'ctrlpvim/ctrlp.vim'
Plug 'editorconfig/editorconfig-vim'
Plug 'mileszs/ack.vim'
Plug 'mkitt/tabline.vim'
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
Plug 'tpope/vim-vinegar' " file explorer
Plug 'wellle/targets.vim' " Text objects

if s:use_colorscheme
  Plug 'lifepillar/vim-solarized8'
  Plug 'bling/vim-airline'
endif
if executable('open')
  Plug 'rizzatti/dash.vim' " <leader>h <leader>H
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
if has('nvim')
  Plug 'Shougo/deoplete.nvim', { 'do': ':UpdateRemotePlugins' }
  Plug 'zchee/deoplete-go', { 'do': 'make' }
  Plug 'mhartington/nvim-typescript', { 'do': ':UpdateRemotePlugins' }
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

if &t_Co > 2 || has("gui_running")
  syntax on
endif
if s:use_colorscheme
  colors solarized8_dark
  set bg=dark
else
  hi! CursorLine NONE
endif

hi! link QuickFixLine Search

" Plugins Options {{{1
let g:netrw_preview   = 1
let g:netrw_winsize   = 30

let g:bufExplorerDisableDefaultKeyMapping = 1

if s:has_ag
  let g:ackprg = 'ag --vimgrep'
endif

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
let g:ctrlp_extensions = ['z', 'f']
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
if has("nvim")
  command! Deoplete call deoplete#toggle()
  let g:deoplete#enable_at_startup = 1
  let g:deoplete#auto_complete_delay = 500
  inoremap <silent><expr> <C-l> deoplete#mappings#manual_complete()
endif

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
call ale#linter#Define('eruby', {
\   'name': 'erubis_rails',
\   'executable': 'erubis',
\   'output_stream': 'stderr',
\   'command': "ruby -pe '$_.gsub!(\"<%=\", \"<%\")' %t | erubis -x | ruby -c",
\   'callback': 'ale#handlers#ruby#HandleSyntaxErrors',
\})
let g:ale_linters = {
  \ 'javascript': ['eslint'],
  \ 'typescript': ['tslint'],
  \ 'lua': ['luacheck', 'luac'],
  \ 'python': [ 'flake8' ],
  \ 'eruby': [ 'erubis_rails' ],
  \ }
let g:ale_lint_on_save = 1
let g:ale_lint_on_text_changed = 'never'
let g:ale_lint_on_enter = 0
let g:ale_lint_on_filetype_changed = 0

let g:go_fmt_fail_silently = 1

" projectionist
let g:projectionist_heuristics = {
      \ "src/*.lua" : {
      \   "src/*.lua": {
      \     "type": "lib",
      \     "alternate": "spec/{}_spec.lua"
      \   },
      \   "spec/*_spec.lua": {
      \     "type": "test",
      \     "alternate": "src/{}.lua"
      \   }
      \ },
      \ "package.json" : {
      \   "*": {
      \     "dispatch": "CI=1 yarn test",
      \   },
      \   "*.test.ts": {
      \     "type": "test",
      \     "alternate": "{}.ts"
      \   },
      \   "*.ts": {
      \     "type": "source",
      \     "alternate": "{}.test.ts"
      \   },
      \   "*.test.tsx": {
      \     "type": "test",
      \     "alternate": "{}.tsx"
      \   },
      \   "*.tsx": {
      \     "type": "source",
      \     "alternate": "{}.test.tsx"
      \   },
      \ }}
      \ "*.go" : {
      \   "*_test.go": {
      \     "type": "test",
      \     "alternate": "{}.go"
      \   },
      \   "*.go": {
      \     "type": "source",
      \     "alternate": "{}_test.go",
      \     "make": "go build",
      \     "dispatch": "go test",
      \   },
      \ }}

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
  if &filetype == "help" || &filetype == "netrw" || &filetype == "vim-plug" || &filetype == "godoc"
    let l:currentWindow = winnr()
    if s:currentWindow > l:currentWindow
      let s:currentWindow = s:currentWindow - 1
    endif
    close
  endif
endfunction
command! Close :pclose | :cclose | :lclose |
      \ let s:currentWindow = winnr() |
      \ :windo call s:CloseDisturbingWin() |
      \ exe s:currentWindow . "wincmd w"

command! Reload :source ~/.vimrc | :filetype detect | :nohl
command! Clear :CtrlPClearCache | :silent! %bd | :silent! argd * | :nohl

command! -complete=shellcmd -nargs=+ Shell call s:RunShellCommand(<q-args>)
function! s:RunShellCommand(cmdline)
  echo a:cmdline
  let expanded_cmdline = a:cmdline
  for part in split(a:cmdline, ' ')
     if part[0] =~ '\v[%#<]'
        let expanded_part = fnameescape(expand(part))
        let expanded_cmdline = substitute(expanded_cmdline, part, expanded_part, '')
     endif
  endfor
  botright 5new
  setlocal buftype=nofile bufhidden=wipe nobuflisted noswapfile nowrap
  execute '$read !'. expanded_cmdline
  setlocal nomodifiable
  1
endfunction

function! CurDir()
  if &filetype == "netrw"
    return b:netrw_curdir
  else
    return expand("%:h")
  endif
endfunction

command! -complete=dir -nargs=1 Tcd :tabnew | :lcd <args>
command! -bang Z call fzf#run(fzf#wrap('Z', {'source': 'fasd -lRd', 'sink': 'lcd'}, <bang>0))
command! -bang D call fzf#run(fzf#wrap('Z', {'source': 'fasd -lRd'}, <bang>0))
command! -bang F call fzf#run(fzf#wrap('F', {'source': 'fasd -lRf'}, <bang>0))
command! -bang T :tabnew | Z

" Config {{{1
set autoread
set expandtab
set shiftwidth=2
set shiftround
set backspace=indent,eol,start
set autoindent
set copyindent
set ignorecase
set smartcase
set smarttab
set scrolloff=2
set sidescrolloff=5
set display+=lastline

set virtualedit="block,insert"
set hlsearch
set incsearch
if !has("win32")
  set listchars=tab:▸\ ,trail:·,extends:>,precedes:<,nbsp:·
endif

if v:version > 703
  set formatoptions+=1jmB
endif

set foldmethod=marker
set foldlevelstart=0
set foldtext=MyFoldText()

set termencoding=utf-8
set encoding=utf-8
set lazyredraw
set laststatus=2

set hidden
set switchbuf=useopen
set history=1000
set tabpagemax=50
set undolevels=1000
if v:version >= 730
  set undofile
  set undodir=~/.vim/.undo,/tmp
endif
if has("vms")
  set nobackup
else
  set backup
endif
set backupdir=~/.vim/backup//
set viminfo=!,'30,\"80
set sessionoptions-=options
set wildmenu
set wildmode=list:longest,full
set wildignore=*.swp,*.bak,*.pyc,*.class,*.beam
set title
set visualbell
set noerrorbells

" set ruler
" set cursorline
set number
set relativenumber

set spellfile=$HOME/.vim-spell-en.utf-8.add
set spelllang=en_us

if s:has_ag
  set grepprg=ag\ --vimgrep\ $*
endif
set grepformat=%f:%l:%c:%m

runtime! macros/matchit.vim

" Keymap {{{1
" leader
let mapleader = " "
let g:mapleader = " "
let maplocalleader = "\\"
let g:maplocalleader = "\\"

" Avoid accidental hits of <F1> while aiming for <Esc>
noremap! <F1> <Esc>

nmap <silent> [c <Plug>(ale_previous_wrap)
nmap <silent> [C <Plug>(ale_first)
nmap <silent> ]c <Plug>(ale_next_wrap)
nmap <silent> ]C <Plug>(ale_last)

inoremap <C-U> <C-G>u<C-U>

nnoremap <C-e> 3<C-e>
nnoremap <C-y> 3<C-y>
nnoremap <silent> <C-n> :bnext<CR>
nnoremap <silent> <C-p> :bNext<CR>

" Use Q for formatting the current paragraph (or visual selection)
vnoremap Q gq
nnoremap Q gqap

" make p in Visual mode replace the selected text with the yank register
vnoremap <silent> p <Esc>:let current_reg = @"<CR>gvdi<C-R>=current_reg<CR><Esc>

" Complete whole filenames/lines with a quicker shortcut key in insert mode
inoremap <C-f> <C-x><C-f>

" Quick yanking to the end of the line
nnoremap Y y$

noremap gH H
noremap gL L
noremap gM M
noremap H 0
noremap L $
noremap M ^

nmap gx <Plug>(Exchange)
nmap gxx <Plug>(ExchangeLine)
nmap gX <Plug>(ExchangeClear)
vmap gx <Plug>(Exchange)

nnoremap <silent> <leader>F :CtrlPClearAllCaches\|:CtrlP<cr>
nnoremap <silent> <leader>1 <C-w>o
nnoremap <silent> <leader>2 <C-w>o<C-w>s<C-w>w:b#<CR><C-w>w
nnoremap <silent> <leader>3 <C-w>o<C-w>v<C-w>w:b#<CR><C-w>w

nnoremap <leader>a :A<cr>

nnoremap <silent> <leader>b :CtrlPBuffer<CR>

nnoremap <silent> <leader>cd :cd <C-R>=CurDir()<CR><CR>
nnoremap <silent> <leader>lcd :lcd <C-R>=CurDir()<CR><CR>

" Use ,d (or ,dd or ,dj or 20,dd) to delete a line without adding it to the
" yanked stack (also, in visual mode)
nnoremap <silent> <leader>d "_d
vnoremap <silent> <leader>d "_d

nnoremap <leader>e/ :e <C-R>=CurDir().'/'<cr>
nnoremap <leader>e. :e <C-R>=CurDir().'/'<cr><cr>
nnoremap <silent> <leader>en :enew<cr>
nnoremap <leader>ee :e <C-R>=expand("%")<cr>
nnoremap <silent> <leader>ev :tabnew $MYVIMRC<cr>

" shortcut to jump to next conflict marker
nnoremap <silent> <leader>fb :CtrlPBuffer<CR>
nnoremap <silent> <leader>fd :CtrlPDir<CR>
nnoremap <silent> <leader>ff :CtrlPF<CR>
nnoremap <silent> <leader>fz :CtrlPZ<CR>
nnoremap <silent> <leader>fh :CtrlPCurFile<CR>
nnoremap <silent> <leader>fe :CtrlPQuickfix<CR>
nnoremap <silent> <leader>fo :CtrlPLine<CR>
nnoremap <silent> <leader>fr :CtrlPMRUFiles<CR>
nnoremap <silent> <leader>ft :CtrlPTag<CR>
nnoremap <silent> <leader>fg :CtrlPMixed<CR>
nnoremap <silent> <leader>fc :CtrlPChange<CR>
nnoremap <silent> <leader>fC :CtrlPChangeAll<CR>
nnoremap <silent> <leader>fB :CtrlPBookmarkDir<CR>

" g local map

nmap <silent> <leader>h <Plug>DashSearch
nmap <silent> <leader>H <Plug>DashGlobalSearch

nnoremap <silent> <leader>i :CtrlPBufTag<CR>
nnoremap <silent> <leader>I :CtrlPBufTagAll<CR>

nnoremap <leader>J :nnoremap <lt>buffer> <lt>leader>j :w\\|!<Up><Left><Left><Left><Left><Left>
nnoremap <leader>j :nnoremap <lt>buffer> <lt>leader>j :w\\|!<Space><C-v><CR<C-v>><Left><Left><Left><Left><Left>

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

nnoremap <leader>p "*p
nnoremap <leader>P "*P

" Tame the quickfix window (open/close using ,q)
nnoremap <silent> <leader>Q :QFix<CR>
nnoremap <silent> <leader>q :CtrlPQuickfix<CR>

nnoremap <silent> <leader>sx :call ToggleTodoStatus(0)<cr>
nnoremap <silent> <leader>sX :call ToggleTodoStatus(1)<cr>
vnoremap <silent> <leader>sx :call ToggleTodoStatus(0)<cr>
vnoremap <silent> <leader>sX :call ToggleTodoStatus(1)<cr>
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

nnoremap <leader>w :Neoformat<cr>:w<cr>

nnoremap <leader>X :nnoremap <lt>leader>x :w\\|!<Up><Left><Left><Left><Left><Left>
nnoremap <leader>x :nnoremap <lt>leader>x :w\\|!<Space><C-v><CR<C-v>><Left><Left><Left><Left><Left>

nnoremap <leader>y "*y
nnoremap <leader>Y "*yy
vnoremap <leader>y "*y

nnoremap <silent> <leader>z :FZF<CR>

nnoremap <silent> <leader>/t /\|.\{-}\|<CR>
nnoremap <silent> <leader>/a :Ack! "\b<cword>\b"<cr>
nnoremap <silent> <leader>/o :vimgrep /\<<C-R><C-w>\>/ %<cr>

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

augroup spell_ft
  au!
  autocmd FileType gitcommit setlocal spell
augroup END

function! SetupLocalMapForGo()
  nmap <buffer> <leader>gg :GoDeclsDir<cr>
  nmap <buffer> <leader>gi :GoImports<cr>
  nmap <buffer> <leader>gd :GoDoc<cr>
  nmap <buffer> <leader>gt :GoTest<cr>
  nmap <buffer> <leader>gaj :GoAddTags json<cr>
  nmap <buffer> <leader>gax :GoAddTags xorm<cr>
  nmap <buffer> <leader>i :GoDecls<cr>
endfunction

augroup go_ft
  au!
  au FileType go call SetupLocalMapForGo()
augroup END

autocmd FileType netrw setl bufhidden=wipe

