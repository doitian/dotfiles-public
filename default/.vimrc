if v:progname =~? "evim" | finish | endif
set nocompatible
set background=light

let loaded_matchparen = 1
let s:has_rg = executable('rg')
if has("nvim") && filereadable(("/usr/local/bin/python3"))
  let g:python3_host_prog = expand("/usr/local/bin/python3")
endif

" Plug {{{1
call plug#begin('~/.vim/plugged')

" filetypes
Plug 'cespare/vim-toml'
Plug 'pangloss/vim-javascript'
Plug 'rust-lang/rust.vim'
Plug 'plasticboy/vim-markdown'
Plug 'vim-ruby/vim-ruby'

if v:version > 740
  Plug 'fatih/vim-go'
endif

" other
Plug 'dyng/ctrlsf.vim'
Plug 'editorconfig/editorconfig-vim'
Plug 'janko-m/vim-test'
Plug 'junegunn/fzf.vim'
Plug 'sbdchd/neoformat'
Plug 'sjl/gundo.vim' " <Leader>u
Plug 'thinca/vim-visualstar' " * # g* g#
Plug 'tommcdo/vim-exchange' " cx
Plug 'tomtom/tcomment_vim' " gc
Plug 'tpope/vim-abolish' " :A :S
Plug 'tpope/vim-dispatch' " <Leader>t
Plug 'tpope/vim-endwise'
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-obsession'
Plug 'tpope/vim-projectionist'
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-surround' " ys s
Plug 'tpope/vim-unimpaired' " various [, ] mappings
Plug 'wellle/targets.vim' " Text objects

if has("gui_running") || &t_Co > 16
  Plug 'NLKNguyen/papercolor-theme'
endif

if has('unix')
  Plug 'tpope/vim-eunuch' " Linux commands
endif

if has('nvim')
  Plug 'radenling/vim-dispatch-neovim'
endif

call plug#end()

set rtp+=/usr/local/opt/fzf

" Theme {{{1
syntax on

if has("gui_running")
  if has("win32")
    set guifont=Source\ Code\ Pro\ Medium:h12
  else
    set guifont=Source\ Code\ Pro\ Medium:h16
  endif

  " Remove toolbar, left scrollbar and right scrollbar
  set go-=e go-=r go-=L go-=T
  set guicursor+=a:blinkwait2000-blinkon1500 " blink slowly
  set mousehide " Hide the mouse when typing text

  map <S-Insert> <MiddleMouse>
  map! <S-Insert> <MiddleMouse>
end

if has("gui_running") || &t_Co > 16
  colorscheme PaperColor
endif

" Plugins Options {{{1

let test#strategy = 'dispatch'
let g:ctrlsf_default_root = 'cwd'
let g:dispatch_compilers = {
      \ 'pipenv run': '',
      \ 'bundle exec': ''}
let g:fzf_buffers_jump = 1
let g:go_fmt_fail_silently = 1
let g:netrw_banner = 0
let g:netrw_liststyle = 3
let g:cargo_makeprg_params = "check --all --all-targets"
let g:vim_markdown_frontmatter = 1
let g:vim_markdown_toml_frontmatter = 1
let g:vim_markdown_math = 1

" Functions & Commands {{{1
function! Tabline()
  let s = ''
  for i in range(tabpagenr('$'))
    let tab = i + 1
    let winnr = tabpagewinnr(tab)
    let buflist = tabpagebuflist(tab)
    let bufnr = buflist[winnr - 1]
    let bufname = fnamemodify(bufname(bufnr), ':t')
    let rename = gettabvar(tab, 'tabline_rename')
    let title = rename != '' ? substitute(rename, '\C%f', bufname, 'g') : (bufname != '' ? bufname : 'No Name')
    let bufmodified = getbufvar(bufnr, "&mod")

    let s .= '%' . tab . 'T'
    let s .= (tab == tabpagenr() ? '%#TabLineSel#' : '%#TabLine#')
    let s .= ' ' . tab .':'
    let s .= '['. title . '] '

    if bufmodified
      let s .= '[+] '
    endif
  endfor

  let s .= '%#TabLineFill#'
  return s
endfunction

" To rename the current tab.
function! s:TabRename(label)
  call settabvar(tabpagenr(), 'tabline_rename', a:label)
  exec 'set showtabline=' . &showtabline
endfunction

command! -nargs=1 Trename call s:TabRename(<q-args>)
command! -nargs=1 Tnew tabnew! | call s:TabRename(<q-args>)
command! -nargs=0 Treset call s:TabReset('')

function! HasPaste()
  if &paste
    return '[P]'
  endif
  return ''
endfunction

function! StatusLineFileName()
  if &filetype != "netrw"
    return pathshorten(expand('%:~:.'))
  elseif b:netrw_curdir == getcwd()
    return "./"
  else
    return pathshorten(fnamemodify(b:netrw_curdir, ':~:.')) . '/'
  endif
endfunction

function! QFixToggle()
  if &filetype == "qf"
    cclose
  else
    copen 10
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

let s:DisturbingFiletypes = { "help": 1, "netrw": 1, "vim-": 1,
      \ "godoc": 1, "git": 1, "man": 1 }

function! s:CloseDisturbingWin()
  if ((&filetype == "" && &diff != 1) || has_key(s:DisturbingFiletypes, &filetype)) && !&modified
    let l:currentWindow = winnr()
    if s:currentWindow > l:currentWindow
      let s:currentWindow = s:currentWindow - 1
    endif
    if winnr("$") == 1 | enew | else | close | endif
  endif
endfunction

function! s:CloseReadonlyWin()
  if &readonly
    if winnr("$") == 1 | enew | else | close | endif
  endif
endfunction

command! DiffOrig vert new | set bt=nofile | r # | 0d_ | diffthis
      \ | wincmd p | diffthis
command! Close :pclose | :cclose | :lclose |
      \ let s:currentWindow = winnr() |
      \ :windo call s:CloseDisturbingWin() |
      \ exe s:currentWindow . "wincmd w"
command! Diffoff :diffoff! | :windo call s:CloseReadonlyWin() | :Close
command! Reload :source ~/.vimrc | :filetype detect | :nohl
command! -bang Clear :silent! %bd<bang> | :silent! argd * | :nohl
command! -nargs=* Diff2qf :cexpr system("diff2qf", system("git diff -U0 " . <q-args>))

function! CurDir()
  if &filetype != "netrw"
    return expand("%:h")
  else
    return b:netrw_curdir
  endif
endfunction

function! PushMark(is_global)
  if a:is_global
    let l:curr = char2nr('Z')
  else
    let l:curr = char2nr('z')
  endif
  let l:until = l:curr - 25
  while l:curr > l:until
    call setpos("'" . nr2char(l:curr), getpos("'" . nr2char(l:curr - 1)))
    let l:curr -= 1
  endwhile
  call setpos("'" . nr2char(l:curr), getpos("."))
endfunction

if !exists("g:bookmark_line_insert_newline")
  let g:bookmark_line_insert_newline = 0
  let g:bookmark_line_prefix = ""
endif
function! BookmarkLine(message, copy)
  let l:line = g:bookmark_line_prefix . expand("%") . "|" . line(".") . " col " . col(".") . "| "
  if a:message == ""
    let l:line = l:line . getline(".")
  else
    let l:line = l:line . a:message
  endif
  if g:bookmark_line_insert_newline
    let l:list = ["", l:line]
  else
    let l:list = [l:line]
  endif
  call writefile(l:list, "bookmarks.qf", "a")
  if a:copy
    let @+ = join(l:list)
  endif
endfunction

function! s:ProjectionistActivate() abort
  let l:vars_query = projectionist#query('vars')
  if len(l:vars_query) > 0
    let l:vars = l:vars_query[0][1]
    for name in keys(l:vars)
      call setbufvar('%', name, l:vars[name])
    endfor
  endif
endfunction

if !exists("g:tmux_send_target")
  let g:tmux_send_target = ".+1"
endif
function! s:TmuxSend(type)
  let &selection = "inclusive"
  let l:sel_save = &selection
  let l:reg_save = @@

  if a:type == 'line'
    silent exe "normal! '[V']y"
  elseif a:type == 'char'
    silent exe "normal! `[v`]y"
  else
    silent exe "normal! gvy"
  endif

  let l:tt_send = "tt -t " . shellescape(g:tmux_send_target) . " "
  let l:lines = split(@@, '\n')
  for l:line in l:lines
    call system(l:tt_send . shellescape(l:line))
  endfor

  let @@ = l:reg_save
  let &selection = l:sel_save
endfunction

command! -bang Fcd call fzf#run(fzf#wrap('fasd -d', {'source': 'fasd -lRd', 'sink': 'cd'}, <bang>0))
command! -bang Flcd call fzf#run(fzf#wrap('fasd -d', {'source': 'fasd -lRd', 'sink': 'lcd'}, <bang>0))
command! -bang Fdir call fzf#run(fzf#wrap('fasd -d', {'source': 'fasd -lRd'}, <bang>0))
command! -bang Ffile call fzf#run(fzf#wrap('fasd -f', {'source': 'fasd -lRf'}, <bang>0))
command! -bang -nargs=* Rg
  \ call fzf#vim#grep(
  \   'rg --hidden -g "!.git" --column --line-number --no-heading --color=always '.shellescape(<q-args>), 1,
  \   <bang>0 ? fzf#vim#with_preview('up:60%')
  \           : fzf#vim#with_preview('right:50%:hidden', '?'),
  \   <bang>0)

command! -nargs=1 -complete=file Cfile let &errorformat = g:bookmark_line_prefix . '%f|%l col %c| %m' | cfile <args>
command! -nargs=1 -complete=file Lfile let &errorformat = g:bookmark_line_prefix . '%f|%l col %c| %m' | lfile <args>
command! -bang -nargs=* B call BookmarkLine(<q-args>, <bang>0)

" Config {{{1

set autoindent
set autoread
set backspace=indent,eol,start
set backup
set backupdir=~/.vim/backup//,.
set copyindent
set directory=~/.vim/swap//,/tmp//,.
set display+=lastline
set expandtab
set foldmethod=marker
set foldtext=MyFoldText()
set hidden
set history=3000
set hlsearch
set ignorecase
set incsearch
set laststatus=2
set lazyredraw
set noerrorbells
set nofoldenable
set nojoinspaces
set noshowmode
set scrolloff=2
set sessionoptions-=options
set shiftround
set shiftwidth=2
set sidescrolloff=5
set smartcase
set smarttab
set spellfile=$HOME/.vim-spell-en.utf-8.add,.vim-spell-en.utf-8.add
set spelllang=en_us,cjk
set statusline=%<%{StatusLineFileName()}\ %m%r%{HasPaste()}%=%l\ %P
set tabline=%!Tabline()
set tabpagemax=50
set title
set undolevels=1000
set viminfo=!,'100,<2000
set virtualedit="block,insert"
set visualbell
set wildignore=*.swp,*.bak,*.pyc,*.class,*.beam
set wildmenu
set wildmode=list:longest,full
set winwidth=78

if has("cscope")
  set cscopequickfix=s-,c-,d-,i-,t-,e-
  if v:version > 740
    set cscopequickfix+=a-
  endif
endif
if v:version > 740
  set formatoptions+=1jmB
endif
if s:has_rg
  set grepformat=%f:%l:%c:%m
  set grepprg=rg\ --hidden\ -g\ '!.git'\ --vimgrep\ $*
endif
if !has("win32")
  set listchars=tab:▸\ ,trail:·,extends:>,precedes:<,nbsp:·
endif
if v:version > 740
  set undodir=~/.vim/undo//,/tmp//,.
  set undofile
endif
if has('nvim')
  set inccommand=nosplit
endif

let $cb = $HOME . '/codebase'

runtime! macros/matchit.vim

" Keymap {{{1
" leader
let mapleader = " "
let g:mapleader = " "
let maplocalleader = "\\"
let g:maplocalleader = "\\"
set pastetoggle=<F2>

nnoremap <silent> t<CR> :TestNearest<CR>
nnoremap <silent> g<CR> :Dispatch<CR>
nnoremap <silent> q<CR> :cc<CR>
nnoremap <silent> q<Space> :call QFixToggle()<CR>

nnoremap <Leader><Space> :Files<CR>

nnoremap <Leader>a :A<CR>

nnoremap <silent> <Leader>b :Buffers<CR>

nnoremap <Leader>cd :Fcd<CR>
nnoremap <Leader>cl :Flcd<CR>
nnoremap <Leader>ct :tabnew<Bar>Flcd<CR>
nnoremap <Leader>css :colorscheme PaperColor<CR>
nnoremap <Leader>csd :colorscheme default<CR>
nnoremap <silent> <Leader>cc :let @+ = @"<CR>
nnoremap <silent> <Leader>cv :let @" = @+<CR>

nnoremap <silent> <Leader>d "_d
vnoremap <silent> <Leader>d "_d

nnoremap <Leader>eh :e <C-r>=CurDir().'/'<CR>
nnoremap <Leader>ed :e <C-r>=CurDir().'/'<CR><CR>
nnoremap <silent> <Leader>en :enew<CR>
nnoremap <silent> <Leader>et :tabnew<CR>
nnoremap <Leader>ee :e <C-r>=expand("%")<CR>
nnoremap <silent> <Leader>ev :tabnew ~/.vimrc<CR>
nnoremap <Leader>e<Space> :e<Space>

nnoremap <silent> <Leader>fb :Buffers<CR>
nnoremap <silent> <Leader>ff :Ffile<CR>
nnoremap <silent> <Leader>fd :Fdir<CR>
nnoremap <silent> <Leader>fo :BLines<CR>
nnoremap <silent> <Leader>fO :Lines<CR>
nnoremap <silent> <Leader>fr :History<CR>
nnoremap <silent> <Leader>f: :History:<CR>
nnoremap <silent> <Leader>f/ :History/<CR>
nnoremap <silent> <Leader>fm :Marks<CR>
nnoremap <silent> <Leader>fw :Windows<CR>
nnoremap <silent> <Leader>f? :Helptags<CR>

nnoremap <Leader>g<Space> :grep<Space>
nnoremap <silent> <Leader>gw :silent grep "\b<cword>\b"<Bar>copen 10<CR>
nnoremap <silent> <Leader>gW :silent grep "\b<cWORD>\b"<Bar>copen 10<CR>

nnoremap <silent> <Leader>h :Files <C-r>=CurDir()<CR><CR>

nnoremap <silent> <Leader>i :BTags<CR>
nnoremap <silent> <Leader>I :Tags<CR>

" j localmap

nnoremap <silent> <Leader>k :Close<CR>

noremap <silent> <Leader>ll :Lexplore<CR>
noremap <silent> <Leader>la :args<CR>
noremap <silent> <Leader>lj :jumps<CR>
noremap <silent> <Leader>lt :tags<CR>
noremap <silent> <Leader>lT :tabs<CR>
noremap <silent> <Leader>lr :registers<CR>
noremap <silent> <Leader>lb :ls<CR>:b<Space>
noremap <silent> <Leader>lm :marks<CR>:normal! `

nnoremap <silent> <Leader>m :call PushMark(0)<CR>
nnoremap <silent> <Leader>M :call PushMark(1)<CR>

nnoremap <silent> <Leader>n :nohlsearch<CR>

nnoremap <Leader>o<Space> :vimgrep //g %<Left><Left><Left><Left>
nnoremap <silent> <Leader>ow :silent vimgrep /\<<C-r><C-w>\>/ %<Bar>copen 10<CR>
nnoremap <silent> <Leader>oW :silent vimgrep /\<<C-r><C-a>\>/ %<Bar>copen 10<CR>

nnoremap <Leader>p "+p
nnoremap <Leader>P "+P

nnoremap <silent> <Leader>q :call QFixToggle()<CR>

" Reveal
nnoremap <silent> <Leader>rt :exe "silent !open -a 'iTerm.app' " . shellescape(CurDir()) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rf :exe "silent !open -R " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rm :exe "silent !open -a 'Marked.app' " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rM :exe "silent !open -a 'Marked.app' " . shellescape(CurDir()) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rr :exe "silent !open " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>ro :exe "silent !open " . shellescape(expand('<cfile>')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>R :checktime<CR>

" Strip all trailing whitespace from a file
nnoremap <silent> <Leader>sw :let _s=@/<Bar>%s/\s\+$//e<Bar>let @/=_s<Bar>nohl<CR>

nnoremap <Leader>tq :Copen<CR>
nnoremap <Leader>t<Space> :Start<Space>
nnoremap <Leader>tb :Start!<Space>
nnoremap <silent> <Leader>tf :TestFile<CR>
nnoremap <silent> <Leader>ts :TestSuite<CR>
nnoremap <silent> <Leader>tt :TestLast<CR>
nnoremap <silent> <Leader>te :TestVisit<CR>

nnoremap <Leader>u :GundoToggle<CR>
" Reselect text that was just pasted
nnoremap <Leader>v `[v`]

nnoremap <silent> <Leader>w :Neoformat<Bar>up<CR>

nnoremap <silent> <Leader>x :<C-u>set opfunc=<SID>TmuxSend<CR>g@
nnoremap <silent> <Leader>xx :<C-u>set opfunc=<SID>TmuxSend<Bar>exe 'norm! 'v:count1.'g@_'<CR>
vnoremap <silent> <Leader>x :<C-u>call <SID>TmuxSend(visualmode())<CR>

nnoremap <Leader>y "+y
nnoremap <Leader>Y "+yy
vnoremap <Leader>y "+y

nnoremap <silent> <Leader>z :FZF<CR>

nnoremap <silent> <Leader>/t /\|.\{-}\|<CR>
nnoremap <Leader>/w /\<\><Left><Left>

nnoremap <silent> <Leader>] :tabclose<CR>
nnoremap <silent> <Leader>[ :Diffoff<CR>

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

  autocmd User ProjectionistActivate call s:ProjectionistActivate()

  autocmd CmdwinEnter * map <buffer> <C-w><C-w> <CR>q:dd

  autocmd BufNewFile,BufRead *.bats set ft=sh

  autocmd FileType gitcommit,markdown,text,rst setlocal spell textwidth=78
  autocmd FileType rust setlocal winwidth=99
  autocmd FileType netrw setlocal bufhidden=wipe
augroup END
