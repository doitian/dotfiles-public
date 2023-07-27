" Preamble {{{1
set nocompatible
set encoding=utf-8
if has('win32') | language en | set ff=unix | endif
if &term ==? 'win32' | set t_Co=256 | endif

" Plug {{{1
silent! call plug#begin($HOME.'/.vim/plugged')

Plug 'catppuccin/vim', { 'as': 'catppuccin' }

Plug 'editorconfig/editorconfig-vim'
Plug 'thinca/vim-visualstar' " * # g* g#
Plug 'tomtom/tcomment_vim' " gc
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-sleuth'
Plug 'tpope/vim-surround' " ys s
Plug 'tpope/vim-unimpaired'

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

" Functions & Commands {{{1
command! DiffOrig vert new | set bt=nofile | r # | 0d_ | diffthis
      \ | wincmd p | diffthis
command! Delete call delete(expand('%')) | bdelete | let @# = 1
command! -nargs=1 -complete=file Move saveas <args> | call delete(expand('#')) | exec "bdelete #" | let @# = 1

if has('win32') || has('ios')
  command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile | silent file __viper__ | nnoremap <buffer> <cr> ggvGg_"+y:%d <lt>Bar> redraw!<lt>CR>
else
  command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile | silent file __viper__ | nnoremap <buffer> <cr> :exec 'w !ctrlc' <lt>Bar> %d <lt>Bar> redraw!<lt>CR>
end

" Config {{{1
set autoindent
set autoread
set backspace=indent,eol,start
set backup
set backupdir=$HOME/.vim/files/backup//,.
set backupext=-vimbackup
set breakindent
set cursorline
set completeopt=menuone,noinsert
set copyindent
set directory=$HOME/.vim/files/swap//,.
set display+=lastline
set expandtab
set nofoldenable
set formatoptions+=1jmBo
set hidden
set history=3000
set hlsearch
set ignorecase
set incsearch
set nojoinspaces
set laststatus=2
set lazyredraw
set linebreak
set list
set report=0
set scrolloff=2
set sessionoptions-=options
set shiftround
set shiftwidth=2
set shortmess-=S
set shortmess+=c
set sidescrolloff=5
set smartcase
set smarttab
set spellfile=$HOME/.vim-spell-en.utf-8.add,.vim-spell-en.utf-8.add
set spelllang=en_us,cjk
set splitbelow
set splitright
set switchbuf=useopen
set synmaxcol=200
set tabpagemax=50
set title
set ttyfast
set undofile
set undolevels=1000
set viminfo=!,'100,<2000
set virtualedit="block,insert"
set visualbell
set wildignore=*.swp,*.bak,*.pyc,*.class,*.beam
set wildmenu
set wildmode=list:longest,full
set winwidth=78
set wrapscan

if has('cscope')
  set cscopequickfix=s-,c-,d-,i-,t-,e-
  set cscopequickfix+=a-
endif
if executable('rg')
  set grepformat=%f:%l:%c:%m
  set grepprg=rg\ --hidden\ -g\ '!.git'\ --vimgrep\ $*
endif
if has('multi_byte') && &encoding ==# 'utf-8'
  set showbreak=│
  let &listchars = 'tab:▸ ,trail:·,extends:»,precedes:«,nbsp:␣'
  let &fillchars = 'foldopen:▾,foldsep:⏐,foldclose:▸,vert:╎'
else
  let &listchars = 'tab:> ,trail:.,extends:>,precedes:<,nbsp:.'
  let &fillchars = 'foldopen:v,foldsep:|,foldclose:>,vert:|'
endif
set undodir=$HOME/.vim/files/undo//

runtime! macros/matchit.vim

" Keymap {{{1
" leader
let mapleader = ' '
let g:mapleader = ' '
let maplocalleader = '\\'
let g:maplocalleader = '\\'
set pastetoggle=<F2>
set wildcharm=<C-z>

nnoremap <Leader><Space> :e <C-z>
nnoremap <Leader>ff :e <C-z>
nnoremap <Leader>fb :b <C-z>

nnoremap <Leader>p "+p
nnoremap <Leader>P "+P
nnoremap <Leader>y "+y
nnoremap <Leader>Y "+Y
xnoremap <Leader>y "+y
xnoremap <Leader>Y "+Y
nnoremap <Leader>d "_d
nnoremap <Leader>D "_D
xnoremap <Leader>d "_d
xnoremap <Leader>D "_D

imap <expr> <Tab>   vsnip#jumpable(1)   ? '<Plug>(vsnip-jump-next)'      : '<Tab>'
smap <expr> <Tab>   vsnip#jumpable(1)   ? '<Plug>(vsnip-jump-next)'      : '<Tab>'
imap <expr> <S-Tab> vsnip#jumpable(-1)  ? '<Plug>(vsnip-jump-prev)'      : '<S-Tab>'
smap <expr> <S-Tab> vsnip#jumpable(-1)  ? '<Plug>(vsnip-jump-prev)'      : '<S-Tab>'

" OS specific settings {{{1
if exists('$WSLENV')
  let g:netrw_browsex_viewer= 'wsl-open'
endif

if has('ios')
  set backupcopy=yes
  set noundofile
endif

" Filetype specific handling {{{1
filetype indent plugin on

augroup vimrc_au
  autocmd!

  autocmd FileType gitcommit,markdown,text setlocal spell
  autocmd FileType markdown set fo+=ro suffixesadd=.md
  autocmd FileType rust setlocal winwidth=99
  autocmd FileType vim,beancount,i3config setlocal foldmethod=marker

  autocmd BufNewFile,BufRead *.bats set ft=bats.sh
  autocmd BufNewFile,BufRead .envrc set ft=envrc.sh
  autocmd BufNewFile,BufRead *.wiki set ft=wiki.text
  autocmd BufNewFile,BufRead *.anki set ft=anki.html
  autocmd BufNewFile,BufRead */gopass-*/* set ft=gopass
  au BufNewFile,BufRead */gopass-*/* setlocal noswapfile nobackup noundofile
  autocmd BufNewFile,BufRead PULLREQ_EDITMSG set ft=gitcommit

  autocmd BufReadPost *
    \ if line("'\"") > 1 && line("'\"") <= line('$') && &filetype !=# 'gitcommit' |
    \   exe 'normal! g`"' |
    \ endif
  autocmd SwapExists * let v:swapchoice = 'o'
augroup END

silent! source $HOME/.vimrc.local
