" Preamble {{{1
set nocompatible
set encoding=utf-8
set background=light
if exists("$TERM_BACKGROUND") | let background=$TERM_BACKGROUND | endif
if has('win32') | language en | set ff=unix | endif
if &term ==? 'win32' | set t_Co=256 | endif

" Plug {{{1
silent! call plug#begin($HOME.'/.vim/plugged')

Plug 'NLKNguyen/papercolor-theme'

Plug 'editorconfig/editorconfig-vim'
Plug 'justinmk/vim-sneak' " s (o)z
Plug 'thinca/vim-visualstar' " * # g* g#
Plug 'tomtom/tcomment_vim' " gc
Plug 'tpope/vim-dispatch', { 'on': ['Make', 'Dispatch', 'Start', 'FocusDispatch'] }
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-sleuth'
Plug 'tpope/vim-surround' " ys ds cs (v)S

Plug 'hrsh7th/vim-vsnip'
Plug 'hrsh7th/vim-vsnip-integ'
Plug 'lifepillar/vim-mucomplete'
Plug 'rafamadriz/friendly-snippets'

if has('win32')
  Plug 'PProvost/vim-ps1'
endif

let s:has_fzf = executable('fzf')
if s:has_fzf
  Plug 'junegunn/fzf'
  Plug 'junegunn/fzf.vim'
endif

let s:nvim = $HOME.'/.config/nvim'
if isdirectory(s:nvim)
  if !has("nvim")
    call plug#(s:nvim)
  endif
  let g:vsnip_snippet_dir = s:nvim.'/local/iy-snippets.vim/snippets'
  call plug#(fnamemodify(g:vsnip_snippet_dir, ':h'))
  call plug#(s:nvim.'/local/iy-bm.vim', { 'on': ['Bm'] })
  call plug#(s:nvim.'/local/iy-diff-orig.vim', { 'on': ['DiffOrig'] })
  call plug#(s:nvim.'/local/iy-nano-fs.vim', { 'on': ['Delete', 'Move'] })
  if s:has_fzf
    call plug#(s:nvim.'/local/fzf-vsnip', { 'on': ['Snippets'] })
  endif
endif

call plug#end()

" Theme {{{1
let g:PaperColor_Theme_Options = { 'theme':{'default':{'transparent_background':!has('ios')}} }
silent! colorscheme PaperColor

" Plugins Options {{{1
let g:netrw_winsize = -40
let g:netrw_banner = 0
let g:netrw_liststyle = 3

let g:dispatch_no_maps = 1

let g:mucomplete#no_mappings = 1
let g:mucomplete#enable_auto_at_startup = 1
let g:mucomplete#chains = {
      \ 'default' : ['vsnip', 'path', 'omni', 'keyn', 'dict', 'uspl'],
      \ 'vim'     : ['vsnip', 'path', 'cmd', 'keyn']
      \ }

let g:vsnip_filetypes = {
      \ 'typescript' : ['typescript', 'tsdoc'],
      \ 'javascript' : ['javascript', 'jsdoc'],
      \ 'lua' : ['lua', 'luadoc'],
      \ 'python' : ['python', 'pydoc'],
      \ 'rust' : ['rust', 'rustdoc'],
      \ 'cs' : ['cs', 'csharpdoc'],
      \ 'java' : ['java', 'javadoc'],
      \ 'sh' : ['sh', 'shelldoc'],
      \ 'zsh' : ['sh', 'shelldoc'],
      \ 'c' : ['c', 'cdoc'],
      \ 'cpp' : ['cpp', 'cppdoc'],
      \ 'php' : ['php', 'phpdoc'],
      \ 'kotlin' : ['kotlin', 'kdoc'],
      \ 'ruby' : ['ruby', 'rdoc']
      \ }

let g:loaded_2html_plugin = 1
let g:loaded_getscriptPlugin = 1
let g:loaded_gzip = 1
let g:loaded_logiPat = 1
let g:loaded_tarPlugin = 1
let g:loaded_vimballPlugin = 1
let g:loaded_zipPlugin = 1
let g:loaded_netrwPlugin = 1

" Functions & Commands {{{1
function! s:LoadNetrw()
  nunmap gx
  xunmap gx
  unlet g:loaded_netrwPlugin
  runtime plugin/netrwPlugin.vim
endfunction

command! -nargs=+ -complete=shellcmd Man delc Man | runtime ftplugin/man.vim | Man <args>
command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile |
      \ silent file __viper__
if s:has_fzf
  command! -bang Zoxide call fzf#run(fzf#wrap('zoxide',
        \ {'source': 'zoxide query -l', 'sink': 'cd'}, <bang>0))
endif

" Config {{{1
" :let @/ = "\\vset (no)?"
set autoindent
set autoread
set autowrite
set backspace=indent,eol,start
set clipboard^=unnamedplus,unnamed
set completeopt=menuone,noinsert
set conceallevel=3
set confirm
set cursorline
set display+=lastline
set expandtab
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
set shortmess+=WIc
set shortmess-=S
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
  set backupdir=.,$HOME/.local/state/vim/backup//
  set directory=.,$HOME/.local/state/vim/swap//
  set undodir=$HOME/.local/state/vim/undo//
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
  set grepprg=rg\ --hidden\ -g\ '!.git'\ --vimgrep
endif

if exists('$WSLENV')
  let g:netrw_browsex_viewer= 'wsl-open'
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
nnoremap <C-s> <cmd>up<cr>
inoremap <C-s> <cmd>up<cr><Esc>
nnoremap <Leader>v `[v`]
nnoremap Y y$
nnoremap <Leader>d "_d
xnoremap <Leader>d "_d
xnoremap <Leader>p "0d
nmap gx <cmd>call <SID>LoadNetrw()<cr>gx
xmap gx <cmd>call <SID>LoadNetrw()<cr>gx
nnoremap ]<Space> <cmd>call append(line('.'), repeat([''], v:count1))<cr>
nnoremap [<Space> <cmd>call append(line('.')-1, repeat([''], v:count1))<cr>

" coding {{{2
nnoremap <silent> g<cr> <cmd>Dispatch!<cr>
nnoremap <silent> m<cr> <cmd>Make<cr>
nnoremap <silent> m! <cmd>Make!<cr>
nnoremap <silent> `<cr> <cmd>Dispatch<cr>
nnoremap <silent> `! <cmd>Dispatch!<cr>
nnoremap <silent> '<cr> <cmd>Start<cr>
nnoremap <silent> '! <cmd>Start!<cr>

nnoremap f<cr> m`gg=G``<cmd>up<cr>
nnoremap <Leader>cf m`gg=G``

" finder {{{2
if s:has_fzf
  nnoremap <Leader><Space> <cmd>Files<cr>
  nnoremap <Leader>ff <cmd>Files<cr>
  nnoremap <Leader>fb <cmd>Buffers<cr>
  nnoremap <Leader>, <cmd>Buffers<cr>
  nnoremap <Leader>fh <cmd>Files %:h<cr>
  nnoremap <Leader>fS <cmd>exe 'Files '.g:vsnip_snippet_dir<cr>
  nnoremap <Leader>fs <cmd>Snippets<cr>
  nnoremap <Leader>fj <cmd>Zoxide<cr>
  nnoremap <Leader>sm <cmd>Marks<cr>
  nnoremap <Leader>sb <cmd>BLines<cr>
  nnoremap <Leader>sB <cmd>Lines<cr>
  nnoremap <Leader>si <cmd>BTags<cr>
  nnoremap <Leader>sI <cmd>Tags<cr>
  nnoremap <Leader>sg <cmd>Rg<cr>
else
  nnoremap <Leader><Space> :<C-u>e <C-z>
  nnoremap <Leader>ff :<C-u>e <C-z>
  nnoremap <Leader>fb <cmd>ls<cr>:<C-u>b<Space>
  nnoremap <Leader>, <cmd>ls<cr>:<C-u>b<Space>
  nnoremap <Leader>fh :<C-u>e %:h<C-z><C-z>
  nnoremap <Leader>fS :<C-u>e <C-r>=g:vsnip_snippet_dir<cr>/<C-z>
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
augroup vimrc_au
  autocmd!

  autocmd CmdUndefined Lexplore call s:LoadNetrw()

  autocmd FileType gitcommit,markdown setlocal spell wrap
  autocmd FileType vim,beancount,i3config setlocal foldmethod=marker

  " edit qf: set ma | ... | cgetb
  autocmd FileType qf
        \ if &buftype ==# 'quickfix' |
        \   nnoremap <silent> <buffer> q <cmd>cclose<cr> |
        \ endif |
        \ setlocal errorformat=%f\|%l\ col\ %c\|%m

  autocmd BufNewFile,BufRead PULLREQ_EDITMSG setlocal filetype=gitcommit
  autocmd BufNewFile,BufRead .envrc setlocal filetype=envrc.sh
  autocmd BufNewFile,BufRead *.bats setlocal filetype=bats.sh
  autocmd BufNewFile,BufRead *.wiki setlocal filetype=wiki.text
  autocmd BufNewFile,BufRead *.anki setlocal filetype=anki.html
  autocmd BufNewFile,BufRead *.qf setlocal filetype=qf
  autocmd BufNewFile,BufRead */gopass-*/*
        \ setlocal filetype=gopass.yaml noswapfile nobackup noundofile

  autocmd BufReadPost *
        \ if line("'\"") > 1 && line("'\"") <= line('$') && &filetype !=# 'gitcommit' |
        \   exe 'normal! g`"' |
        \ endif
  autocmd SwapExists * echow "swap exists" | let v:swapchoice=exists('b:swapchoice')?b:swapchoice:'o'
augroup END

" Direnv {{{1
if exists('$DIRENV_EXTRA_VIMRC')
  source $DIRENV_EXTRA_VIMRC
endif
