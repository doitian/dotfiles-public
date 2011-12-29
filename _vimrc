if v:progname =~? "evim"
  finish
endif

colorscheme solarized

if &t_Co > 2 || has("gui_running")
  syntax on
  set hlsearch
endif
if has('gui_running')
  set guicursor+=a:blinkon0
endif
set mouse=
set ruler

set nocompatible
set backspace=indent,eol,start
if has("vms")
  set nobackup
else
  set backup
endif
set history=1000
set showcmd
set incsearch
set pastetoggle=<F12>

set background=dark
set expandtab
set tabstop=4
set softtabstop=4
set shiftwidth=2
set hidden
set wildmode=list:longest,list:full
set wildignore+=*.o,*.obj,.git,*.rbc,*.class,.svn,vendor/gems/*
set laststatus=2
set ignorecase
set smartcase
set scrolloff=3
set backupdir=~/.backup/vim,.,/var/tmp,/tmp
set directory=~/.backup/vim,.,/var/tmp,/tmp
set ruler
set cinoptions=g0,:0,t0,(0,U1,Ws,m1

if has("autocmd")
  filetype plugin indent on

  au BufReadPost *
    \ if line("'\"") > 1 && line("'\"") <= line("$") |
    \   exe "normal! g`\"" |
    \ endif

  au FileType text setlocal textwidth=78
  au FileType make set noexpandtab

  au BufRead,BufNewFile .xsession setf sh
  au BufRead,BufNewFile .vimperatorrc setf vim
  au BufRead,BufNewFile *.json setf javascript 
  au BufRead,BufNewFile *.{md,markdown} setf mkd
else
  set autoindent
endif " has("autocmd")

if !exists(":DiffOrig")
  command DiffOrig vert new | set bt=nofile | r # | 0d_ | diffthis
		  \ | wincmd p | diffthis
endif

runtime ftplugin/man.vim

map Q gq

let mapleader = " "
nmap <silent> <leader>s :set nolist!<CR>
nmap <silent> <leader>n :set nohlsearch!<CR>

noremap <C-J> <C-W>j
noremap <C-K> <C-W>k
noremap <C-H> <C-W>h
noremap <C-L> <C-W>l
noremap <C-X><C-X> ``

" Opens an edit command with the path of the currently edited file filled in
" Normal mode: <Leader>e
map <leader>e :e <C-R>=expand("%:p:h") . "/" <CR>
" Inserts the path of the currently edited file into a command
" Command mode: Ctrl+P
cmap <C-P> <C-R>=expand("%:p:h") . "/" <CR>

command! -nargs=* Make make <args> | cwindow 3

command! Suw write !sudo tee %

command! H cd %:h

noremap <F5> :Make<CR>

inoremap <ESC><BS> <C-W>
cnoremap <ESC><BS> <C-W>

map <leader>rt :!ctags --extra=+f -R *<CR><CR>
map <C-\> :tnext<CR>

" taglist
let Tlist_GainFocus_On_ToggleOpen = 1
nnoremap <silent> <Leader>t :TlistToggle<CR>
" NERD_tree
let NERDTreeChDirMode = 2
let NERDTreeQuitOnOpen = 1
nnoremap <silent> <Leader>d :NERDTreeToggle<CR>
nnoremap <Leader>D :NERDTree 
nnoremap <silent> <C-X><C-J> :NERDTreeFind<CR>
