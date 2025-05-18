" Preamble {{{1
" vim: foldmethod=marker
if &compatible | set nocompatible | endif
set encoding=utf-8
if exists("$TERM_BACKGROUND") | let &background=$TERM_BACKGROUND | endif
if has('win32') | language en | set ff=unix | endif
if &term ==? 'win32' | set t_Co=256 | endif

" Plug {{{1
set rtp+=$HOME/.dotfiles/repos/private/nvim
set pp=$HOME/.vim,$HOME/.config/nvim,$VIMRUNTIME
if !has('nvim')
  set rtp^=$HOME/.config/nvim
  set rtp+=$HOME/.config/nvim/after
endif

let s:has_fzf = executable('fzf')
let g:vsnip_snippet_dir = $HOME.'/.config/nvim/snippets'

function! s:PackInit() abort
  if exists('g:loaded_minpac') | return | endif

  let minpacpath = $HOME.'/.vim/pack/minpac/opt/minpac'
  if !isdirectory(minpacpath) && executable('git')
    call system('git clone --filter=blob:none https://github.com/k-takata/minpac.git ' . shellescape(minpacpath))
  endif
  packadd minpac

  call minpac#init()

  call minpac#add('editorconfig/editorconfig-vim')
  call minpac#add('justinmk/vim-sneak') " s (o)z
  call minpac#add('thinca/vim-visualstar') " * # g* g#
  call minpac#add('tommcdo/vim-exchange') " cx
  call minpac#add('tomtom/tcomment_vim') " gc
  call minpac#add('tpope/vim-markdown') " latest version
  call minpac#add('tpope/vim-repeat')
  call minpac#add('tpope/vim-sleuth')
  call minpac#add('tpope/vim-surround') " ys ds cs (v)S

  call minpac#add('hrsh7th/vim-vsnip')
  call minpac#add('hrsh7th/vim-vsnip-integ')
  call minpac#add('lifepillar/vim-mucomplete')

  call minpac#add('NLKNguyen/papercolor-theme', {'type': 'opt'})
  call minpac#add('k-takata/minpac', {'type': 'opt'})
  call minpac#add('sbdchd/neoformat', {'type': 'opt'})
  call minpac#add('tpope/vim-dispatch', {'type': 'opt'})
  call minpac#add('junegunn/goyo.vim', {'type': 'opt'})

  if has('win32')
    call minpac#add('PProvost/vim-ps1')
  endif

  if s:has_fzf
    call minpac#add('junegunn/fzf')
    call minpac#add('junegunn/fzf.vim')
  endif
endfunction

" Theme {{{1
silent! colorscheme PaperColor
filetype plugin indent on
syntax enable

" Plugins Options {{{1
let g:netrw_banner = 0
let g:netrw_liststyle = 3
let g:netrw_winsize = -40

let g:dispatch_no_maps = 1

let g:mucomplete#no_mappings = 1
let g:mucomplete#enable_auto_at_startup = 1
let g:mucomplete#completion_delay = 1
let g:mucomplete#empty_text = 1
let g:mucomplete#chains = {
      \ 'default' : ['vsnip', 'path', 'omni', 'keyn', 'dict', 'uspl'],
      \ 'vim'     : ['vsnip', 'path', 'cmd', 'keyn']
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
command! -nargs=+ -complete=shellcmd Man delc Man | runtime ftplugin/man.vim | Man <args>
command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile |
      \ silent file __viper__
if s:has_fzf
  command! -bang Zoxide call fzf#run(fzf#wrap('zoxide',
        \ {'source': 'zoxide query -l', 'sink': 'cd'}, <bang>0))
endif

command! PackUpdate call <SID>PackInit() | call minpac#update()
command! PackClean  call <SID>PackInit() | call minpac#clean()
command! PackStatus call <SID>PackInit() | call minpac#status()

" Config {{{1
" :let @/ = "\\vset (no)?"
set autoindent
set autoread
set autowrite
set backspace=indent,eol,start
set completeopt=menuone
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
set sessionoptions-=blank ssop-=options ssop+=tabpages
set shiftround
set shiftwidth=2
set shortmess+=WIc
set shortmess-=S
set sidescrolloff=8
set smartcase
set smartindent
set smarttab
set spellfile=$HOME/.vim-spell-en.utf-8.add,.vim-spell-en.utf-8.add
set spelllang=en,cjk
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

runtime macros/matchit.vim

" Keymap {{{1
" leader {{{2
let mapleader = ' '
let g:mapleader = ' '
let maplocalleader = '\\'
let g:maplocalleader = '\\'
set wildcharm=<C-Z>

" editor {{{2
nnoremap <C-S> <Cmd>up<CR>
inoremap <C-S> <Cmd>up<CR><Esc>
vnoremap <C-S> <Cmd>up<CR><Esc>
snoremap <C-S> <Cmd>up<CR><Esc>
nnoremap <Leader>v `[v`]
nnoremap Y y$
nnoremap <Leader>d "_d
xnoremap <Leader>d "_d
nnoremap <Leader>D "_d$
xnoremap <Leader>D "_d$
nnoremap <Leader>p "0p
xnoremap <Leader>p "0p
nnoremap <Leader>P "0P
xnoremap <Leader>P "0P
nnoremap <Leader>y "+y
xnoremap <Leader>y "+y
nnoremap <Leader>Y "+y$
xnoremap <Leader>Y "+y$
nnoremap >gp <Cmd>exec 'put '.v:register<CR>j
nnoremap <gp <Cmd>exec 'put! '.v:register<CR>j
nnoremap >p <Cmd>exec 'put '.v:register."<Bar>keepjump norm '["<CR>
nnoremap <p <Cmd>exec 'put! '.v:register."<Bar>keepjump norm '["<CR>
nnoremap <expr> j v:count == 0 ? 'gj' : 'j'
xnoremap <expr> j v:count == 0 ? 'gj' : 'j'
nnoremap <expr> k v:count == 0 ? 'gk' : 'k'
xnoremap <expr> k v:count == 0 ? 'gk' : 'k'
nnoremap <expr> n 'Nn'[v:searchforward].'zv'
xnoremap <expr> n 'Nn'[v:searchforward]
onoremap <expr> n 'Nn'[v:searchforward]
nnoremap <expr> N 'nN'[v:searchforward].'zv'
xnoremap <expr> N 'nN'[v:searchforward]
onoremap <expr> N 'nN'[v:searchforward]
inoremap , ,<C-G>u
inoremap . .<C-G>u
inoremap ; ;<C-G>u
xnoremap < <gv
xnoremap > >gv
nnoremap gx <Cmd>call job_start(['open',expand('<cfile>')])<CR>
xnoremap gx y<Cmd>call job_start(['open',@*])<CR>
nnoremap ]<Space> <Cmd>call append(line('.'), repeat([''], v:count1))<CR>
nnoremap [<Space> <Cmd>call append(line('.')-1, repeat([''], v:count1))<CR>
nnoremap & <Cmd>&&<CR>
xnoremap & :&&<CR>

" ui {{{2
nnoremap <Leader>qq <Cmd>qa<CR>
nnoremap <Leader>ur <Cmd>noh<Bar>diffupdate<Bar>normal! <C-L><CR>
nnoremap <silent> <Leader>e <Cmd>Lexplore<CR>

nnoremap <Leader>xq <Cmd>copen<CR>
nnoremap <Leader>xl <Cmd>lopen<CR>
nnoremap <silent> ]q <Cmd>exe v:count1.'cnext'<CR>zv
nnoremap <silent> [q <Cmd>exe v:count1.'cprevious'<CR>zv

nnoremap <Leader>uz <Cmd>Goyo<CR>

" coding {{{2
nnoremap <silent> g<CR> <Cmd>Dispatch!<CR>

nnoremap <silent> m<CR> <Cmd>Make<CR>
nnoremap <silent> m! <Cmd>Make!<CR>
nnoremap <silent> `<CR> <Cmd>Dispatch<CR>
nnoremap <silent> `! <Cmd>Dispatch!<CR>
nnoremap <silent> '<CR> <Cmd>Start<CR>
nnoremap <silent> '! <Cmd>Start!<CR>

nnoremap f<CR> <Cmd>undojoin<Bar>Neoformat<Bar>up<CR>
nnoremap <Leader>cf <Cmd>undojoin<Bar>Neoformat<CR>

" finder {{{2
nnoremap <Leader>fn <Cmd>enew<CR>
if s:has_fzf
  command! -bang -nargs=* RgHidden call fzf#vim#grep("rg --hidden -g '!.git' --column --line-number --no-heading --color=always --smart-case -- ".fzf#shellescape(<q-args>), fzf#vim#with_preview(), <bang>0)
  nnoremap <Leader><Space> <Cmd>Files<CR>
  nnoremap <Leader>, <Cmd>Buffers<CR>
  nnoremap <Leader>/ <Cmd>RgHidden<CR>
  nnoremap <Leader>: <Cmd>History:<CR>

  nnoremap <Leader>ff <Cmd>Files<CR>
  nnoremap <Leader>fb <Cmd>Buffers<CR>
  nnoremap <Leader>fh <Cmd>Files %:h<CR>
  nnoremap <Leader>fr <Cmd>History<<CR>
  nnoremap <Leader>fS <Cmd>exe 'Files '.g:vsnip_snippet_dir<CR>
  nnoremap <Leader>fs <Cmd>VSnippets<CR>
  nnoremap <Leader>fz <Cmd>Zoxide<CR>
  nnoremap <Leader>sm <Cmd>Marks<CR>
  nnoremap <Leader>sb <Cmd>BLines<CR>
  nnoremap <Leader>sB <Cmd>Lines<CR>
  nnoremap <Leader>si <Cmd>BTags<CR>
  nnoremap <Leader>sI <Cmd>Tags<CR>
  nnoremap <Leader>sg <Cmd>RgHidden<CR>
  nnoremap <Leader>sw :RgHidden \<<C-R><C-W>\><CR>
  nnoremap <Leader>sm <Cmd>Marks<CR>
  nnoremap <Leader>s/ <Cmd>History/<CR>
  nnoremap <Leader>sc <Cmd>History:<CR>
  nnoremap <Leader>sC <Cmd>Commands<CR>
  nnoremap <Leader>sh <Cmd>Helptags<CR>
  nnoremap <Leader>sk <Cmd>Maps<CR>
  nnoremap <Leader>gs <Cmd>GFiles?<CR>
else
  nnoremap <Leader><Space> :<C-u>e <C-z>
  nnoremap <Leader>, <Cmd>ls<CR>:<C-u>b<Space>
  nnoremap <Leader>sw :grep '\<<C-R><C-W>\>'<CR>

  nnoremap <Leader>ff :<C-u>e <C-z>
  nnoremap <Leader>fb <Cmd>ls<CR>:<C-u>b<Space>
  nnoremap <Leader>fh :<C-u>e %:h<C-z><C-z>
  nnoremap <Leader>fS <Cmd>VsnipOpen<CR>
endif

" navigation {{{2
nnoremap <silent> <Leader>bd <Cmd>bdelete<CR>
nnoremap <Leader>bb <Cmd>e #<CR>
nnoremap <Leader>` <Cmd>e #<CR>
nmap <silent> <expr> H v:count == 0 ? '<Cmd>bprevious<CR>' : 'H'
nmap <silent> <expr> L v:count == 0 ? '<Cmd>bnext<CR>' : 'L'
nnoremap <silent> ]b <Cmd>exec v:count1.'bnext'<CR>
nnoremap <silent> [b <Cmd>exec v:count1.'bprevious'<CR>
nnoremap ]a <Cmd>exec v:count1.'next'<CR>
nnoremap [a <Cmd>exec v:count1.'previous'<CR>

nnoremap <Leader>ww <C-w>p
nnoremap <Leader>wd <C-w>c
nnoremap <Leader>w- <C-w>s
nnoremap <Leader>ws <C-w>s
nnoremap <Leader>w<Bar> <C-w>v
nnoremap <Leader>wv <C-w>v
nnoremap <Leader>- <C-w>s
nnoremap <Leader>wk <Cmd>Close<CR>
nnoremap <Leader><Bar> <C-w>v
nnoremap <C-H> <C-W>h
nnoremap <C-L> <C-W>l
nnoremap <C-K> <C-W>k
nnoremap <C-J> <C-W>j

nnoremap <Leader><Tab><Tab> <Cmd>tabnew<CR>
nnoremap <Leader><Tab>d <Cmd>tabclose<CR>
nnoremap <Leader><Tab>l <Cmd>tablast<CR>
nnoremap <Leader><Tab>f <Cmd>tabclose<CR>
nnoremap <Leader><Tab>] gt
nnoremap <Leader><Tab>[ gT

nnoremap <Leader>fj <Cmd>drop `jrnl -p`<CR>

" complete {{{2
imap <expr> <Tab>   vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<Tab>'
smap <expr> <Tab>   vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<Tab>'
imap <expr> <S-Tab> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<S-Tab>'
smap <expr> <S-Tab> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<S-Tab>'
imap <expr> <C-L>   vsnip#expandable() ? '<Plug>(vsnip-expand)' : '<Plug>(MUcompleteFwd)'
imap <expr> <CR>    pumvisible() ? '<C-Y>' : '<CR>'
" always insert newline
inoremap <expr> <C-J> pumvisible() ? "<C-E><C-J>" : "<C-J>"

" Filetype specific handling {{{1
augroup vimrc_au
  autocmd!

  autocmd CmdUndefined Make,Dispatch,Start,FocusDispatch packadd vim-dispatch
  autocmd CmdUndefined Neoformat packadd neoformat
  autocmd CmdUndefined Goyo packadd goyo.vim

  " run the command and keep the window open
  autocmd CmdwinEnter * map <buffer> <C-W><C-W> <CR>q:dd

  autocmd FileType gitcommit,markdown setlocal spell wrap

  " edit qf: set ma | ... | cgetb
  autocmd FileType qf
        \ if &buftype ==# 'quickfix' |
        \   nnoremap <silent> <buffer> q <Cmd>cclose<CR> |
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
        \   exe 'normal! g`"zv' |
        \ endif
  autocmd SwapExists * echow "swap exists" | let v:swapchoice=exists('b:swapchoice')?b:swapchoice:'o'

  " auto save session
  autocmd VimLeavePre * if v:this_session !=# '' | exec 'sil! mks! '.v:this_session | endif
augroup END

" Direnv {{{1
if exists('$DIRENV_EXTRA_VIMRC')
  source $DIRENV_EXTRA_VIMRC
endif
