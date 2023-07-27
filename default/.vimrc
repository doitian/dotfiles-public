" Preamble {{{1
set nocompatible
set encoding=utf-8
if has('win32') | language en | set ff=unix | endif
if &term ==? 'win32' | set t_Co=256 | endif

" Plug {{{1
silent! call plug#begin($HOME.'/.vim/plugged')

Plug 'catppuccin/vim', { 'as': 'catppuccin' }

Plug 'ctrlpvim/ctrlp.vim'
Plug 'editorconfig/editorconfig-vim'
Plug 'thinca/vim-visualstar' " * # g* g#
Plug 'tomtom/tcomment_vim' " gc
Plug 'tpope/vim-abolish' " cr :A :S
Plug 'tpope/vim-projectionist'
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-sleuth'
Plug 'tpope/vim-surround' " ys s
Plug 'tpope/vim-unimpaired' " various [, ] mappings
Plug 'wellle/targets.vim' " Text objects

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
let g:ctrlp_root_markers = []
let g:ctrlp_working_path_mode = 'a'

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

function! s:ExpandAlias(cmdtype, trigger, content)
  return getcmdtype() is# a:cmdtype && getcmdline() is# a:trigger ? a:content : a:trigger
endfunction

cnoreabbrev <expr> mapcr <SID>ExpandAlias(":", "mapcr", "nnoremap <buffer> <lt>CR> :up<lt>Bar>!<lt>CR><Left><Left><Left><Left>")
cnoreabbrev <expr> cpcd <SID>ExpandAlias(":", "cpcd", "let @+ = 'cd ' . shellescape(getcwd())<cr>")
cnoreabbrev <expr> cp% <SID>ExpandAlias(":", "cp%", "let @+ = expand('%')<cr>")

if has('win32')
  cnoreabbrev <expr> cmd <SID>ExpandAlias(":", "cmd", "set shell=cmd.exe shellcmdflag=/c noshellslash guioptions-=!")
endif

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
set report=0
set scrolloff=2
set sessionoptions-=options
set shiftround
set shiftwidth=2
set shortmess-=S
set sidescrolloff=5
set smartcase
set smarttab
set spellfile=$HOME/.vim-spell-en.utf-8.add,.vim-spell-en.utf-8.add
set spelllang=en_us,cjk
set splitbelow
set splitright
set switchbuf=useopen
set synmaxcol=200
" set tabline=%!Tabline()
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
set wildcharm=<C-Z>

nnoremap <silent> <Leader><Space> :CtrlP<cr>
nnoremap <silent> <Leader>ff :CtrlP<cr>
nnoremap <silent> <Leader>fb :CtrlPBuffer<cr>
nnoremap <silent> <Leader>n :noh<cr>

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

function! s:ProjectionistActivate() abort
  let l:vars_query = projectionist#query('vars')
  if len(l:vars_query) > 0
    let l:vars = l:vars_query[0][1]
    for name in keys(l:vars)
      call setbufvar('%', name, l:vars[name])
    endfor
  endif
endfunction

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
  autocmd CmdwinEnter * map <buffer> <C-w><C-w> <cr>q:dd

  autocmd User ProjectionistActivate silent! call s:ProjectionistActivate()
augroup END

if executable('fasd')
  function! s:FasdUpdate() abort
    if empty(&buftype)
      let l:path = &filetype ==# 'netrw' ? b:netrw_curdir : expand('%:p')
      let l:comm = ['fasd', '-A', l:path]
      " nvim: jobstart
      call job_start(l:comm)
    endif
  endfunction
  augroup fasd
    autocmd!
    autocmd BufWinEnter,BufFilePost * call s:FasdUpdate()
  augroup END
endif

silent! source $HOME/.vimrc.local
