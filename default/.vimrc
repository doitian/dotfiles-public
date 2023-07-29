" Preamble {{{1
set nocompatible
set encoding=utf-8
if has('win32') | language en | set ff=unix | endif
if &term ==? 'win32' | set t_Co=256 | endif

" Plug {{{1
silent! call plug#begin($HOME.'/.vim/plugged')

Plug 'catppuccin/vim', { 'as': 'catppuccin' }

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

call plug#end()

" Theme {{{1
syntax on
set termguicolors
silent! colorscheme catppuccin_latte

" Plugins Options {{{1
let loaded_matchparen = 1

let g:mucomplete#no_mappings = 1
let g:mucomplete#enable_auto_at_startup = 1
let g:mucomplete#chains = {
\ 'default' : ['vsnip', 'path', 'omni', 'keyn', 'dict', 'uspl'],
\ 'vim'     : ['vsnip', 'path', 'cmd', 'keyn']
\ }

let g:vsnip_snippet_dir = expand("~/.vim/snippets")
let g:szaurround_no_mappings = 1

" Functions & Commands {{{1
command! DiffOrig vert new | set bt=nofile | r # | 0d_ | diffthis
      \ | wincmd p | diffthis
command! Delete call delete(expand('%')) | bdelete | let @# = bufnr('%')
command! -nargs=1 -complete=file Move saveas <args>
      \ | call delete(expand('#')) | exec "bdelete #" | let @# = bufnr('%')
command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile | silent file __viper__

" Config {{{1
" sort /set (no)?/
set autoindent
set autoread
set autowrite
set backspace=indent,eol,start
set backupdir=$HOME/.vim/files/backup//,.
set completeopt=menuone,noinsert
set clipboard^=unnamedplus,unnamed
set conceallevel=3
set confirm
set cursorline
set directory=$HOME/.vim/files/swap//,.
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
set undodir=$HOME/.vim/files/undo//
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
" leader
let mapleader = ' '
let g:mapleader = ' '
let maplocalleader = '\\'
let g:maplocalleader = '\\'
set pastetoggle=<F2>
set wildcharm=<C-z>

nmap <silent> <expr> H v:count == 0 ? '<cmd>bprevious<cr>' : 'H'
nmap <silent> <expr> L v:count == 0 ? '<cmd>bnext<cr>' : 'L'
nnoremap <C-h> <C-w>h
nnoremap <C-l> <C-w>l
nnoremap <C-k> <C-w>k
nnoremap <C-j> <C-w>j
nnoremap <Leader>ww <C-w>p
nnoremap <Leader>wd <C-w>c
nnoremap <Leader>w- <C-w>s
nnoremap <Leader>w<bar> <C-w>v
nnoremap <Leader>- <C-w>s
nnoremap <Leader><bar> <C-w>v

nnoremap ]<Space> :call append(line('.'), '')<cr>
nnoremap [<Space> :call append(line('.')-1, '')<cr>

nnoremap <Leader><Space> :e <C-z>
nnoremap <Leader>ff :e <C-z>
nnoremap <Leader>fb :b <C-z>
nnoremap <Leader>fh :e %:h<C-z><C-z>
nnoremap <Leader>fs :e ~/.vim/snippets/<C-z>
nnoremap <Leader>bd <cmd>bdelete<cr>
nnoremap <Leader>bb <cmd>e #<cr>
nnoremap <Leader>` <cmd>e #<cr>
nnoremap <Leader><Tab><Tab> <cmd>tabnew<cr>
nnoremap <Leader><Tab>d <cmd>tabclose<cr>
nnoremap <Leader><Tab>l <cmd>tablast<cr>
nnoremap <Leader><Tab>f <cmd>tabclose<cr>
nnoremap <Leader><Tab>] gt
nnoremap <Leader><Tab>[ gT
nnoremap <Leader>ur <cmd>noh<bar>diffupdate<bar>normal! <C-L><cr>

nnoremap <Leader>p "+p
nnoremap <Leader>P "+P
nnoremap <Leader>y "+y
nnoremap <Leader>Y "+Y
xnoremap <Leader>y "+y
xnoremap <Leader>Y "+Y

imap <expr> <Tab>   vsnip#jumpable(1)   ? '<Plug>(vsnip-jump-next)'      : '<Tab>'
smap <expr> <Tab>   vsnip#jumpable(1)   ? '<Plug>(vsnip-jump-next)'      : '<Tab>'
imap <expr> <S-Tab> vsnip#jumpable(-1)  ? '<Plug>(vsnip-jump-prev)'      : '<S-Tab>'
smap <expr> <S-Tab> vsnip#jumpable(-1)  ? '<Plug>(vsnip-jump-prev)'      : '<S-Tab>'


" Filetype specific handling {{{1
filetype indent plugin on

augroup vimrc_au
  autocmd!

  autocmd FileType gitcommit,markdown setlocal spell
  autocmd FileType markdown setlocal suffixesadd=.md
  autocmd FileType vim,beancount,i3config setlocal foldmethod=marker

  autocmd BufNewFile,BufRead *.bats setlocal filetype=bats.sh
  autocmd BufNewFile,BufRead .envrc setlocal filetype=envrc.sh
  autocmd BufNewFile,BufRead *.wiki setlocal filetype=wiki.text
  autocmd BufNewFile,BufRead *.anki setlocal filetype=anki.html
  autocmd BufNewFile,BufRead PULLREQ_EDITMSG setlocal filetype=gitcommit
  autocmd BufNewFile,BufRead */gopass-*/* setlocal filetype=gopass noswapfile nobackup noundofile

  autocmd BufReadPost *
    \ if line("'\"") > 1 && line("'\"") <= line('$') && &filetype !=# 'gitcommit' |
    \   exe 'normal! g`"' |
    \ endif
  autocmd SwapExists * let v:swapchoice = 'o'
augroup END

silent! source $HOME/.vimrc.local
