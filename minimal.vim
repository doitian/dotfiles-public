" Preamble {{{1
if v:progname =~? "evim" | finish | endif
set nocompatible
set encoding=utf-8
set background=light
if has("win32") | language en | set ff=unix | endif
if &term == 'win32' | set t_Co=256 | endif
let loaded_matchparen = 1
let s:has_rg = executable('rg')
if $SSH_HOME != '' | let $HOME = $SSH_HOME | endif

syntax on
hi CursorLine term=underline cterm=none ctermbg=254 guibg=Grey90

" Functions & Commands {{{1
function! CurDir()
  if &filetype != "netrw"
    let l:dir = expand("%:h")
    if l:dir != ""
      return l:dir
    endif
    return getcwd()
  else
    return b:netrw_curdir
  endif
endfunction

command! DiffOrig vert new | set bt=nofile | r # | 0d_ | diffthis
      \ | wincmd p | diffthis

command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile | silent file __viper__ | nnoremap <buffer> <CR> ggvGg_"+y:%d <lt>Bar> redraw!<lt>CR>

" Config {{{1
set autoindent
set autoread
set backspace=indent,eol,start
set backup
set backupdir=$HOME/.vim/files/backup//,.
set backupext=-vimbackup
set breakindent
set cursorline
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
set scrolloff=2
set sessionoptions-=options
set shiftround
set shiftwidth=2
set shortmess-=S
set showbreak=│
set sidescrolloff=5
set smartcase
set smarttab
set spellfile=$HOME/.vim-spell-en.utf-8.add,.vim-spell-en.utf-8.add
set spelllang=en_us,cjk
set tabpagemax=50
set title
set undofile
set undolevels=1000
set viminfo=!,'100,<2000
set virtualedit="block,insert"
set visualbell
set wildignore=*.swp,*.bak,*.pyc,*.class,*.beam
set wildmenu
set wildmode=list:longest,full
set winwidth=78

if s:has_rg
  set grepformat=%f:%l:%c:%m
  set grepprg=rg\ --hidden\ -g\ '!.git'\ --vimgrep\ $*
endif
if has('multi_byte') && &encoding ==# 'utf-8'
  let &listchars = 'tab:▸\ ,trail:·,extends:»,precedes:«,nbsp:␣'
else
  let &listchars = 'tab:> ,trail:.,extends:>,precedes:<,nbsp:.'
endif
if has("nvim")
  set undodir=$HOME/.vim/files/nvim-undo//
else
  set undodir=$HOME/.vim/files/undo//
endif

runtime! macros/matchit.vim

" Keymap {{{1
" leader
let mapleader = " "
let g:mapleader = " "
let maplocalleader = "\\"
let g:maplocalleader = "\\"
set pastetoggle=<F2>
set wildcharm=<C-Z>

set rtp+=/usr/local/opt/fzf
if exists(':FZF')
  nnoremap <silent> <Leader><Space> :FZF<CR>
else
  nnoremap <Leader><Space> :e<Space>**/
endif

nnoremap <Leader>lch :lcd <C-r>=CurDir().'/'<CR>
nnoremap <Leader>ch :cd <C-r>=CurDir().'/'<CR>
nnoremap <Leader>c<Space> :cd<Space><C-Z>
nnoremap <Leader>lc<Space> :lcd<Space><C-Z>
nnoremap <silent> <Leader>cc :let @+ = @"<CR>
nnoremap <silent> <Leader>cv :let @" = @+<CR>

nnoremap <silent> <Leader>d "_d
vnoremap <silent> <Leader>d "_d

nnoremap <Leader>eh :e <C-r>=CurDir().'/'<CR>
nnoremap <silent> <Leader>en :enew<CR>
nnoremap <silent> <Leader>et :tabnew<CR>
nnoremap <Leader>ee :e <C-r>=expand("%:r")<CR><C-Z>
nnoremap <Leader>eb :sview `=expand($HOME."/.vim/files/backup/") . substitute(expand("%:p"), "[\\\\/]", "%", "g") . "~"`<CR>
nnoremap <silent> <Leader>ev :tabnew $HOME/.vimrc<CR>
nnoremap <Leader>ew :e<Space>**/
nnoremap <Leader>e<Space> :e<Space><C-Z>
nnoremap <Leader>ed :e $HOME/.diary/<C-R>=strftime('%Y-%m-%d')<CR>.md<CR>
nnoremap <Leader>em :e $HOME/.diary/<C-R>=strftime('%Y-%m-%d', localtime() + 86400)<CR>.md<CR>
nnoremap <Leader>ey :e $HOME/.diary/<C-R>=strftime('%Y-%m-%d', localtime() - 86400)<CR>.md<CR>

nnoremap <Leader>g<Space> :grep<Space>
nnoremap <silent> <Leader>gw :silent grep "\b<cword>\b"<Bar>copen 10<CR>
nnoremap <silent> <Leader>gW :silent grep "\b<cWORD>\b"<Bar>copen 10<CR>

nnoremap <silent> <Leader>K <C-^>:bd #<Bar>let @# = 1<CR>

" lc used in <Leader>c
nnoremap <silent> <Leader>ll :25Lexplore<CR>
nnoremap <silent> <Leader>la :args<CR>
nnoremap <silent> <Leader>lj :jumps<CR>
nnoremap <silent> <Leader>lt :tags<CR>
nnoremap <silent> <Leader>lT :tabs<CR>
nnoremap <silent> <Leader>lr :registers<CR>
nnoremap <silent> <Leader>lb :ls<CR>:b<Space>
nnoremap <silent> <Leader>lm :marks<CR>:normal! `

nnoremap <silent> <leader>n :nohlsearch<CR>

nnoremap <Leader>o<Space> :vimgrep //g %<Left><Left><Left><Left>
nnoremap <silent> <Leader>ow :silent vimgrep /\<<C-r><C-w>\>/ %<Bar>copen 10<CR>
nnoremap <silent> <Leader>oW :silent vimgrep /\<<C-r><C-a>\>/ %<Bar>copen 10<CR>

nnoremap <Leader>p "+p
nnoremap <Leader>P "+P

nnoremap <Leader>th :tabnew <C-r>=CurDir().'/'<CR>
nnoremap <Leader>td :tabnew <C-r>=CurDir().'/'<CR><CR>
nnoremap <silent> <Leader>tn :tabnew<CR>

nnoremap <Leader>v `[v`]

nnoremap <Leader>y "+y
nnoremap <Leader>Y "+yy
vnoremap <Leader>y "+y

nnoremap <silent> <Leader>/t /\|.\{-}\|<CR>
nnoremap <Leader>/w /\<\><Left><Left>

nnoremap <silent> <Leader>] :tabclose<CR>

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

  autocmd SwapExists * let v:swapchoice = "o"

  autocmd CmdwinEnter * map <buffer> <C-w><C-w> <CR>q:dd

  autocmd FileType gitcommit,markdown,text setlocal spell
  autocmd FileType markdown set fo+=ro
  autocmd FileType netrw setlocal bufhidden=wipe
  autocmd FileType rust setlocal winwidth=99
  autocmd FileType vim setlocal foldmethod=marker

  autocmd BufNewFile,BufRead *.bats set ft=sh
  autocmd BufNewFile,BufRead *.tid set ft=markdown
  autocmd BufNewFile,BufRead */gopass-*/* set ft=gopass
  au BufNewFile,BufRead */gopass-*/* setlocal noswapfile nobackup noundofile
  autocmd BufNewFile,BufRead PULLREQ_EDITMSG set ft=gitcommit
augroup END

silent! source $HOME/.vimrc.local
