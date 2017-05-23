if v:progname =~? "evim"
  finish
endif
set nocompatible
scriptencoding utf-8
set encoding=utf-8

let has_ag = executable('ag')

" Plug {{{1
call plug#begin('~/.vim/plugged')

Plug 'amiorin/ctrlp-z'
Plug 'bkad/CamelCaseMotion' " <leader>w <leader>b <leader>e
Plug 'cespare/vim-toml'
Plug 'ctrlpvim/ctrlp.vim'
Plug 'editorconfig/editorconfig-vim'
Plug 'fatih/vim-go'
Plug 'Glench/Vim-Jinja2-Syntax'
Plug 'junegunn/vim-easy-align' " Enter in visual mode
Plug 'mxw/vim-jsx'
Plug 'pangloss/vim-javascript'
Plug 'rust-lang/rust.vim'
Plug 'saltstack/salt-vim'
Plug 'sbdchd/neoformat'
Plug 'sjl/gundo.vim' " <leader>u
Plug 'thinca/vim-visualstar' " * # g* g#
Plug 'tommcdo/vim-exchange' " gx gX
Plug 'tomtom/tcomment_vim' " gc
Plug 'tpope/vim-abolish' " :A :S
Plug 'tpope/vim-dispatch' " <leader>t
Plug 'tpope/vim-endwise'
Plug 'tpope/vim-fugitive' " git client
Plug 'tpope/vim-markdown'
Plug 'tpope/vim-obsession' " :Obsess
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-surround' " ys s
Plug 'tpope/vim-unimpaired' " various [, ] mappings
Plug 'tpope/vim-vinegar' " file explorer

if has("gui_running") || &t_Co > 16
  Plug 'altercation/vim-colors-solarized'
  Plug 'bling/vim-airline'
endif
if executable('open')
  Plug 'rizzatti/dash.vim' " <leader>h <leader>H
endif
if has_ag
  Plug 'rking/ag.vim'
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

if has('python')
  Plug 'FelikZ/ctrlp-py-matcher'
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
if has("gui_running") || &t_Co > 16
  colors solarized
  set bg=dark
else
  hi CursorLine NONE
endif

hi MatchParen cterm=bold ctermbg=none ctermfg=red gui=bold guibg=NONE guifg=red

" Plugins Options {{{1
let g:netrw_preview   = 1
let g:netrw_winsize   = 30

let g:bufExplorerDisableDefaultKeyMapping = 1

let g:ctrlp_root_markers = []
let g:ctrlp_switch_buffer = 'et'
let g:ctrlp_working_path_mode = 'a'
let g:ctrlp_map = '<leader><space>'
if has_ag
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
if has('python')
  let g:ctrlp_match_func = { 'match': 'pymatcher#PyMatch' }
endif
" CtrlP auto cache clearing.
" ----------------------------------------------------------------------------
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

" syntastic
let g:ale_linters = {
  \ 'javascript': ['flow', 'eslint'],
  \ 'lua': ['luacheck', 'luac'],
  \ 'python': [ 'flake8' ],
  \ }
let g:ale_lint_on_save = 1
let g:ale_lint_on_text_changed = 0
let g:ale_lint_on_enter = 0

" projectionist
let g:projectionist_heuristics = {
      \ "app/service/*.lua" : {
      \   "app/*.lua": {
      \     "type": "source",
      \     "alternate": "spec/{}_spec.lua"
      \   },
      \   "spec/*_spec.lua": {
      \     "type": "test",
      \     "alternate": "app/{}.lua"
      \   },
      \   "skynetx/lualib/*.lua": {
      \     "type": "source",
      \     "alternate": "skynetx/spec/lualib/{}_spec.lua"
      \   },
      \   "skynetx/spec/*_spec.lua": {
      \     "type": "test",
      \     "alternate": "skynetx/{}.lua"
      \   },
      \   "*.lua": { "dispatch": "make test" },
      \   "*": { "console": "bin/lua" }
      \ },
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
      \ "*_test.go" : {
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
      \ },
      \ "Rakefile&!config/environment.rb" : {
      \   "lib/*.rb": {
      \     "type": "lib",
      \     "template": ["class {camelcase|capitalize|colons}"],
      \     "alternate": "test/{}_test.rb"
      \   },
      \   "test/*_test.rb": {
      \     "type": "test",
      \     "dispatch": "ruby -Ilib -Itest {file}",
      \     "template": ["class {camelcase|capitalize|colons}Test < Minitest::Test", "end"],
      \     "alternate": "lib/{}.rb",
      \     "related": "test/test_helper.rb"
      \   },
      \   "*": { "make": "rake" }
      \ }}

let g:jsx_ext_required = 0
let g:javascript_plugin_flow = 1

let g:neoformat_only_msg_on_error = 1

" Functions & Commands {{{1
command! -bar -nargs=1 OpenURL :!open <args>

function! EchoError(msg)
  execute "normal \<Esc>"
  echohl ErrorMsg
  echomsg a:msg
  echohl None
endfunction

function! ExecAndShowError(command)
  let v:errmsg = ""
  silent! exec a:command
  if v:errmsg != ""
    call EchoError(v:errmsg)
  endif
endfunction

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

command! Reload :source ~/.vimrc | :filetype detect | :nohl
command! Clear :CtrlPClearCache | :bufdo bd | :silent! argd * | :nohl

command! -complete=dir -nargs=1 Tcd :tabnew | :lcd <args>

" Toggle [ ] and [x]
function! ToggleTodoStatus(clear)
  let _s = @/
  if a:clear
    s/\[[-x]\]/[ ]/e
  else
    s/\[\([- x]\)\]/\=submatch(1) == ' ' ? '[x]' : '[ ]'/e
  endif
  let @/ = _s
  nohl
endfunction

" wrapper function to restore the cursor position, window position,
" and last search after running a command.
function! Preserve(command)
  " Save the last search
  let last_search=@/
  " Save the current cursor position
  let save_cursor = getpos(".")
  " Save the window position
  normal H
  let save_window = getpos(".")
  call setpos('.', save_cursor)

  " Do the business:
  execute a:command

  " Restore the last_search
  let @/=last_search
  " Restore the window position
  call setpos('.', save_window)
  normal zt
  " Restore the cursor position
  call setpos('.', save_cursor)
endfunction

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
  " call setline(1, 'You entered:    ' . a:cmdline)
  " call setline(2, 'Expanded Form:  ' .expanded_cmdline)
  " call setline(3,substitute(getline(2),'.','=','g'))
  execute '$read !'. expanded_cmdline
  setlocal nomodifiable
  1
endfunction

" Config {{{1
set autoread
set expandtab
set shiftwidth=2
set shiftround
set backspace=indent,eol,start
set autoindent
set copyindent
" set number
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
set pastetoggle=<F12>

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
set cursorline
" set ruler

set spellfile=$HOME/.vim-spell-en.utf-8.add
set spelllang=en_us

if has_ag
  set grepprg=ag\ --vimgrep\ $*
endif
set grepformat=%f:%l:%c:%m
" set relativenumber

runtime! macros/matchit.vim

" Shortcut mappings {{{1
let mapleader = " "
let g:mapleader = " "
let maplocalleader = "\\"
let g:maplocalleader = "\\"

" Avoid accidental hits of <F1> while aiming for <Esc>
noremap! <F1> <Esc>

nmap <silent> [c <Plug>(ale_previous_wrap)
nmap <silent> ]c <Plug>(ale_next_wrap)

inoremap <C-U> <C-G>u<C-U>

noremap <leader>%p i<C-R>=expand('%:p')<cr><Esc>
noremap <leader>%h i<C-R>=expand('%:h').'/'<cr><Esc>
noremap <leader>%t i<C-R>=expand('%:t')<cr><Esc>
noremap <leader>%% i<C-R>=expand('%')<cr><Esc>

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
inoremap <C-l> <C-x><C-l>

" Quick yanking to the end of the line
nnoremap Y y$

noremap gH H
noremap gL L
noremap gM M
noremap H 0
noremap L $
noremap M ^

inoremap <C-a> <Home>
inoremap <C-e> <End>
inoremap <C-y><C-y> <C-R>"

vnoremap <silent> <Enter> :EasyAlign<cr>

nmap gx <Plug>(Exchange)
nmap gxx <Plug>(ExchangeLine)
nmap gX <Plug>(ExchangeClear)
vmap gx <Plug>(Exchange)

nnoremap <silent> <leader>F :CtrlPClearAllCaches\|:CtrlP<cr>
nnoremap <silent> <leader>1 <C-w>o
nnoremap <silent> <leader>2 <C-w>o<C-w>s<C-w>w:b#<CR><C-w>w
nnoremap <silent> <leader>3 <C-w>o<C-w>v<C-w>w:b#<CR><C-w>w

nnoremap <leader>a :A<cr>

" b subword
call camelcasemotion#CreateMotionMappings('<leader>')

nnoremap <silent> <leader>cd :cd %:h<CR>

" Use ,d (or ,dd or ,dj or 20,dd) to delete a line without adding it to the
" yanked stack (also, in visual mode)
nnoremap <silent> <leader>d "_d
vnoremap <silent> <leader>d "_d

" e subword

" shortcut to jump to next conflict marker
nnoremap <leader>f/ :e <C-R>=expand('%:h').'/'<cr>
nnoremap <silent> <leader>fb :CtrlPBuffer<CR>
nnoremap <silent> <leader>fd :CtrlPDir<CR>
nnoremap <silent> <leader>ff :CtrlPF<CR>
nnoremap <silent> <leader>fz :CtrlPZ<CR>
nnoremap <silent> <leader>f. :CtrlPCurFile<CR>
nnoremap <silent> <leader>fe :CtrlPQuickfix<CR>
nnoremap <silent> <leader>fo :CtrlPLine<CR>
nnoremap <silent> <leader>fr :CtrlPMRUFiles<CR>
nnoremap <silent> <leader>ft :CtrlPTag<CR>
nnoremap <silent> <leader>fg :CtrlPMixed<CR>
nnoremap <silent> <leader>fc :CtrlPChange<CR>
nnoremap <silent> <leader>fC :CtrlPChangeAll<CR>
nnoremap <silent> <leader>fB :CtrlPBookmarkDir<CR>

" g unused

nmap <silent> <leader>h <Plug>DashSearch
nmap <silent> <leader>H <Plug>DashGlobalSearch

nnoremap <silent> <leader>i :CtrlPBufTag<CR>
nnoremap <silent> <leader>I :CtrlPBufTagAll<CR>

" j, k unused

nmap <silent> <leader>ll :Lexplore<CR>
nmap <silent> <leader>lt :tags<CR>
nmap <silent> <leader>lm :marks<cr>
nmap <silent> <leader>lr :registers<cr>
nmap <silent> <leader>l@ :registers<cr>
noremap <silent> <leader>lbe :BufExplorer<CR>
noremap <silent> <leader>lbt :ToggleBufExplorer<CR>
noremap <silent> <leader>lbb :ToggleBufExplorer<CR>
noremap <silent> <leader>lbs :BufExplorerHorizontalSplit<CR>
noremap <silent> <leader>lbv :BufExplorerVerticalSplit<CR>

nnoremap <silent> <leader>m :Make<CR>
nnoremap <silent> <leader>M :Make!<CR>

nnoremap <silent> <leader>n :nohlsearch<CR>

nnoremap <silent> <leader>ot :exe "silent !open -a 'Terminal.app' " . shellescape(expand('%:h')) . " &> /dev/null" \| :redraw!<cr>
nnoremap <silent> <leader>of :exe "silent !open -R " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<cr>
nnoremap <silent> <leader>om :exe "silent !open -a 'Marked 2.app' " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<cr>
nnoremap <silent> <leader>oM :exe "silent !open -a 'Marked 2.app' " . shellescape(expand('%:h')) . " &> /dev/null" \| :redraw!<cr>
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
" Reselect text that was just pasted with ,v
nnoremap <leader>v V`]

" w subword

nnoremap <leader>X :nnoremap <lt>leader>x :w\\|!<Up><Left><Left><Left><Left><Left>
nnoremap <leader>x :nnoremap <lt>leader>x :w\\|!<Space><C-v><CR<C-v>><Left><Left><Left><Left><Left>

nnoremap <leader>y "*y
nnoremap <leader>Y "*yy
vnoremap <leader>y "*y

" UNUSED z

nnoremap <silent> <leader>/c /^\(<\\|=\\|>\)\{7\}\([^=].\+\)\?$<CR>
nnoremap <silent> <leader>/t /\|.\{-}\|<CR>
nnoremap <silent> <leader>// :nohlsearch<CR>


" search word under cursor
nnoremap <leader>; ;
nnoremap <leader>: ,

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
  autocmd filetype markdown highlight link frontmatter Comment
  autocmd filetype markdown let b:dispatch = 'mmd %'
augroup end

augroup jinjia2_ft
  au!

  autocmd BufNewFile,BufRead *.j2 set ft=jinja
augroup END

augroup sls_ft
  au!

  autocmd BufNewFile,BufRead pillar.example set ft=sls
augroup END

augroup cg_ft
  au!

  autocmd BufNewFile,BufRead *.shader set ft=cg
  autocmd filetype cg syntax keyword shaderlabmarker CGPROGRAM ENDCG 
  autocmd filetype glsl syntax keyword shaderlabmarker GLSLPROGRAM ENDGLSL
  autocmd filetype cg,glsl syntax keyword shaderlabblock Shader Properties SubShader Tags FallBack Blend Range
  autocmd filetype cg,glsl syntax keyword shaderlabfunc UnpackNormal
  autocmd filetype cg,glsl syntax keyword shaderlabtype 2D Float Integer
  autocmd filetype cg,glsl highlight link shaderlabmarker PreProc
  autocmd filetype cg,glsl highlight link shaderlabblock Statement
  autocmd filetype cg,glsl highlight link shaderlabfunc Statement
  autocmd filetype cg,glsl highlight link shaderlabtype Type
augroup END

augroup spell_ft
  au!
  autocmd FileType gitcommit setlocal spell
augroup END

autocmd FileType netrw setl bufhidden=wipe

