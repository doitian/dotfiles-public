" Preamble {{{1
set nocompatible
set encoding=utf-8
set background=light
if $TERM_BACKGROUND != '' | let background=$TERM_BACKGROUND | endif
if has('win32') | language en | set ff=unix | endif
if &term ==? 'win32' | set t_Co=256 | endif

" Plug {{{1
silent! call plug#begin($HOME.'/.vim/plugged')

Plug 'NLKNguyen/papercolor-theme'

Plug 'editorconfig/editorconfig-vim'
Plug 'justinmk/vim-sneak'
Plug 'thinca/vim-visualstar' " * # g* g#
Plug 'tomtom/tcomment_vim' " gc
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-sleuth'
Plug 'tpope/vim-surround' " ys s

Plug 'hrsh7th/vim-vsnip'
Plug 'hrsh7th/vim-vsnip-integ'
Plug 'rafamadriz/friendly-snippets'
Plug 'lifepillar/vim-mucomplete'

if has('win32')
  Plug 'PProvost/vim-ps1'
endif

let s:has_fzf = executable('fzf')
if s:has_fzf
  let s:fzf_opts = { 'on': ['FZF', 'Files', 'Buffers'] }
  Plug 'junegunn/fzf'
  Plug 'junegunn/fzf.vim'
endif

call plug#end()

" Theme {{{1
syntax on
let g:PaperColor_Theme_Options = { 'theme':{'default':{'transparent_background':1}} }
silent! colorscheme PaperColor

" Plugins Options {{{1
let g:netrw_winsize = -40
let g:netrw_banner = 0
let g:netrw_liststyle = 3

let g:mucomplete#no_mappings = 1
let g:mucomplete#enable_auto_at_startup = 1
let g:mucomplete#chains = {
      \ 'default' : ['vsnip', 'path', 'omni', 'keyn', 'dict', 'uspl'],
      \ 'vim'     : ['vsnip', 'path', 'cmd', 'keyn']
      \ }

let g:vsnip_snippet_dir = expand('~/.dotfiles/repos/private/snippets/snippets')
exec 'set rtp+='..fnamemodify(g:vsnip_snippet_dir, ':h')

" Functions & Commands {{{1
function! s:BookmarkLine(message)
  let l:line = expand('%') . '|' . line('.') . ' col ' . col('.') . '| '
        \ . (a:message ==# '' ? getline('.') : a:message)
  call writefile([l:line], 'bookmarks.qf', 'a')
endfunction

command! DiffOrig vert new | set bt=nofile | r # | 0d_ | diffthis
      \ | wincmd p | diffthis
command! Delete call delete(expand('%')) | bdelete | let @# = bufnr('%')
command! -nargs=1 -complete=file Move saveas <args>
      \ | call delete(expand('#')) | exec 'bdelete #' | let @# = bufnr('%')
command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile | silent file __viper__
command! -nargs=* Bm call <SID>BookmarkLine(<q-args>)
if s:has_fzf
  command! -bang Zoxide call fzf#run(fzf#wrap('zoxide', {'source': 'zoxide query -l', 'sink': 'cd'}, <bang>0))
endif

" Config {{{1
" sort /set (no)?/
set autoindent
set autoread
set autowrite
set backspace=indent,eol,start
set completeopt=menuone,noinsert
set clipboard^=unnamedplus,unnamed
set conceallevel=3
set confirm
set cursorline
set display+=lastline
set expandtab
set nofoldenable
set formatoptions=jcroqlnt
set hidden
set history=3000
set hlsearch
set ignorecase
set incsearch
set nojoinspaces
set laststatus=2
set lazyredraw
set list
set number
set pumheight=10
set relativenumber
set scrolloff=4
set sessionoptions=buffers,curdir,tabpages,winsize,help,globals,skiprtp
set shiftround
set shiftwidth=2
set shortmess-=S
set shortmess+=WIc
set sidescrolloff=8
set smartcase
set smartindent
set smarttab
set spellfile=$HOME/.vim-spell-en.utf-8.add,.vim-spell-en.utf-8.add
set spelllang=en
set splitbelow
set splitright
set switchbuf=useopen
set synmaxcol=200
set tabpagemax=50
set tabstop=2
set timeoutlen=700
set ttyfast
set undofile
set undolevels=1000
set updatetime=1800
set viminfo=!,'100,<50,s10,h
set visualbell
set wildignore=*.swp,*.bak,*.pyc,*.class,*.beam
set wildmenu
set wildmode=longest:full,full
set winminwidth=5
set winwidth=78
set nowrap

if !has("nvim")
  set backupdir=$HOME/.vim/files/backup//,.
  set directory=$HOME/.vim/files/swap//,.
  set undodir=$HOME/.vim/files/undo//
endif

if has('multi_byte') && &encoding ==# 'utf-8'
  let &listchars = 'tab:▸ ,trail:·,extends:»,precedes:«,nbsp:␣'
  let &fillchars = 'foldopen:▾,foldsep:⏐,foldclose:▸,vert:╎'
else
  let &listchars = 'tab:> ,trail:.,extends:>,precedes:<,nbsp:.'
  let &fillchars = 'foldopen:v,foldsep:|,foldclose:>,vert:|'
endif

if executable('rg')
  set grepformat=%f:%l:%c:%m
  set grepprg=rg\ --hidden\ -g\ '!.git'\ --vimgrep\ $*
endif

if exists('$WSLENV')
  let g:netrw_browsex_viewer= 'wsl-open'
endif

if has('ios')
  set backupcopy=yes
  set noundofile
endif

runtime! macros/matchit.vim

" Keymap {{{1
" leader {{{2
let mapleader = ' '
let g:mapleader = ' '
let maplocalleader = '\\'
let g:maplocalleader = '\\'
set pastetoggle=<F2>
set wildcharm=<C-z>

" editor {{{2
nnoremap <silent> <C-s> <cmd>up<cr>
nnoremap <Leader>v `[v`]
nnoremap <silent> ]<Space> :call append(line('.'), '')<cr>
nnoremap <silent> [<Space> :call append(line('.')-1, '')<cr>

" coding {{{2
nnoremap <silent> g<cr> <cmd>make<cr>
nnoremap f<cr> m`gg=G``<cmd>up<cr>
nnoremap <Leader>cf m`gg=G``

" finder {{{2
if s:has_fzf
  nnoremap <Leader><Space> <cmd>Files<cr>
  nnoremap <Leader>ff <cmd>Files<cr>
  nnoremap <Leader>fb <cmd>Buffers<cr>
  nnoremap <Leader>, <cmd>Buffers<cr>
  nnoremap <Leader>fh <cmd>Files %:h<cr>
  nnoremap <Leader>fs :Files <C-r>=g:vsnip_snippet_dir<cr><cr>
  nnoremap <Leader>fj <cmd>Zoxide<cr>
  nnoremap <Leader>sm <cmd>Marks<cr>
else
  nnoremap <Leader><Space> :e <C-z>
  nnoremap <Leader>ff :e <C-z>
  nnoremap <Leader>fb <cmd>ls<cr>:b<Space>
  nnoremap <Leader>, <cmd>ls<cr>:b<Space>
  nnoremap <Leader>fh :e %:h<C-z><C-z>
  nnoremap <Leader>fs :e <C-r>=g:vsnip_snippet_dir<cr>/<C-z>
  nnoremap <Leader>sm <cmd>marks<cr>:norm '
endif

" buffer {{{2
nnoremap <silent> <Leader>bd <cmd>bdelete<cr>
nnoremap <Leader>bb <cmd>e #<cr>
nnoremap <Leader>` <cmd>e #<cr>
nmap <silent> <expr> H v:count == 0 ? '<cmd>bprevious<cr>' : 'H'
nmap <silent> <expr> L v:count == 0 ? '<cmd>bnext<cr>' : 'L'
nnoremap <silent> ]b <cmd>bnext<cr>
nnoremap <silent> [b <cmd>bprevious<cr>

" window {{{2
nnoremap <Leader>ww <C-w>p
nnoremap <Leader>wd <C-w>c
nnoremap <Leader>w- <C-w>s
nnoremap <Leader>w<bar> <C-w>v
nnoremap <Leader>- <C-w>s
nnoremap <Leader><bar> <C-w>v
nnoremap <C-h> <C-w>h
nnoremap <C-l> <C-w>l
nnoremap <C-k> <C-w>k
nnoremap <C-j> <C-w>j

" tab {{{2
nnoremap <Leader><Tab><Tab> <cmd>tabnew<cr>
nnoremap <Leader><Tab>d <cmd>tabclose<cr>
nnoremap <Leader><Tab>l <cmd>tablast<cr>
nnoremap <Leader><Tab>f <cmd>tabclose<cr>
nnoremap <Leader><Tab>] gt
nnoremap <Leader><Tab>[ gT

" ui {{{2
nnoremap <Leader>ur <cmd>noh<bar>diffupdate<bar>normal! <C-L><cr>
nnoremap <silent> <Leader>e <cmd>Lexplore<cr>

" qf {{{2
nnoremap <Leader>xq <cmd>copen<cr>
nnoremap <Leader>xl <cmd>lopen<cr>
nnoremap <silent> ]q <cmd>cnext<cr>
nnoremap <silent> [q <cmd>cprevious<cr>

" complete {{{2
imap <expr> <Tab>   vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<Tab>'
smap <expr> <Tab>   vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<Tab>'
imap <expr> <S-Tab> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<S-Tab>'
smap <expr> <S-Tab> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<S-Tab>'

" Filetype specific handling {{{1
filetype indent plugin on

augroup vimrc_au
  autocmd!

  autocmd FileType gitcommit,markdown setlocal spell
  autocmd FileType markdown setlocal suffixesadd=.md
  autocmd FileType vim,beancount,i3config setlocal foldmethod=marker
  " edit qf: set ma | ... | cgetb
  autocmd FileType qf
        \ if &buftype ==# 'quickfix' | nnoremap <silent> <buffer> q <cmd>cclose<cr> | endif |
        \ setlocal errorformat=%f\|%l\ col\ %c\|%m

  autocmd BufNewFile,BufRead PULLREQ_EDITMSG setlocal filetype=gitcommit
  autocmd BufNewFile,BufRead .envrc setlocal filetype=envrc.sh
  autocmd BufNewFile,BufRead *.bats setlocal filetype=bats.sh
  autocmd BufNewFile,BufRead *.wiki setlocal filetype=wiki.text
  autocmd BufNewFile,BufRead *.anki setlocal filetype=anki.html
  autocmd BufNewFile,BufRead *.qf setlocal filetype=qf
  autocmd BufNewFile,BufRead */gopass-*/* setlocal filetype=gopass noswapfile nobackup noundofile

  autocmd BufReadPost *
        \ if line("'\"") > 1 && line("'\"") <= line('$') && &filetype !=# 'gitcommit' |
        \   exe 'normal! g`"' |
        \ endif
  autocmd SwapExists * let v:swapchoice = 'o'
augroup END

" Direnv {{{1
if exists('$DIRENV_EXTRA_VIMRC')
  silent! source $DIRNEV_EXTRA_VIMRC
endif
