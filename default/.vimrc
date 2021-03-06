" Preamble {{{1
if v:progname =~? "evim" | finish | endif
set nocompatible
set encoding=utf-8
set background=light
if has("win32") | language en | set ff=unix | endif
if &term == 'win32' | set t_Co=256 | endif
let loaded_matchparen = 1
let s:has_rg = executable('rg')

" Plug {{{1
silent! call plug#begin('~/.vim/plugged')

" filetypes
Plug 'cespare/vim-toml'
Plug 'plasticboy/vim-markdown'

" other
Plug 'NLKNguyen/papercolor-theme'

Plug 'dyng/ctrlsf.vim', { 'on': 'CtrlSF' }
Plug 'editorconfig/editorconfig-vim'
Plug 'godlygeek/tabular', { 'on': 'Tabularize' }
Plug 'janko-m/vim-test', { 'on': ['TestNearest', 'TestFile', 'TestSuite', 'TestLast', 'TestVisit'] }
Plug 'junegunn/goyo.vim', { 'for': 'markdown' }
Plug 'junegunn/limelight.vim', { 'on': 'Limelight' }
Plug 'sbdchd/neoformat', { 'on': 'Neoformat' }
Plug 'simnalamburt/vim-mundo', { 'on': 'MundoToggle' }
Plug 'thinca/vim-visualstar' " * # g* g#
Plug 'tommcdo/vim-exchange' " cx
Plug 'tomtom/tcomment_vim' " gc
Plug 'tpope/vim-abolish' " :A :S
Plug 'tpope/vim-dispatch', { 'on': ['FocusDispatch', 'Dispatch'] }
Plug 'tpope/vim-endwise'
Plug 'tpope/vim-fugitive', { 'on': ['Git', 'Gstatus', 'Gdiffsplit'] }
Plug 'tpope/vim-obsession'
Plug 'tpope/vim-projectionist'
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-surround' " ys s
Plug 'tpope/vim-unimpaired' " various [, ] mappings
Plug 'wellle/targets.vim' " Text objects

if has('unix')
  Plug 'tpope/vim-eunuch' " Linux commands
endif

if has('win32')
  Plug 'junegunn/fzf'
  Plug 'PProvost/vim-ps1'
endif

if has('ios')
  Plug 'ctrlpvim/ctrlp.vim'
else
  Plug 'junegunn/fzf.vim'
endif

if has('python3')
  Plug 'SirVer/ultisnips'
endif

call plug#end()

set rtp+=/usr/local/opt/fzf

" Theme {{{1
syntax on

if has("gui_running")
  " Remove toolbar, left scrollbar and right scrollbar
  set go-=e go-=r go-=L go-=T go-=m
  set guicursor+=a:blinkwait2000-blinkon1500 " blink slowly
  set mousehide " Hide the mouse when typing text
end

silent! colorscheme PaperColor

" Plugins Options {{{1
let test#strategy = 'dispatch'
let g:ctrlsf_default_root = 'cwd'
let g:dispatch_compilers = {
      \ 'pipenv run': '',
      \ 'bundle exec': ''}
let g:fzf_buffers_jump = 1
let g:fzf_layout = { 'down': '40%' }
let g:go_fmt_fail_silently = 1
let g:netrw_banner = 0
let g:netrw_liststyle = 3
let g:netrw_browse_split = 4 " open in prior window
let g:netrw_altv = 1 " split to the right
let g:cargo_makeprg_params = "check --all --all-targets"
let g:vim_markdown_frontmatter = 1
let g:vim_markdown_math = 1
let g:vim_markdown_strikethrough = 1
let g:UltiSnipsSnippetDirectories = [ $HOME.'/.vim/UltiSnips' ]
let g:UltiSnipsListSnippets = "<c-f>"

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

function! HasPaste()
  return &paste ? '[P]' : ''
endfunction

function! StatusLineFileName()
  if &filetype != "netrw"
    return &buftype != "nofile" ? pathshorten(expand('%:~:.')) : expand("%")
  elseif b:netrw_curdir == getcwd()
    return "./"
  else
    return pathshorten(fnamemodify(b:netrw_curdir, ':~:.')) . '/'
  endif
endfunction

function! StatusLineFileFormat()
  let l:flags = []
  let l:encoding = &fileencoding != '' ? &fileencoding : &encoding
  if l:encoding != 'utf-8' | call add(l:flags, l:encoding) | endif
  if &bomb | call add(l:flags, '+bomb') | endif
  if &fileformat != 'unix' | call add(l:flags, printf('[%s] ', &fileformat)) | endif
  return join(l:flags, '')
endfunction

function! s:QFixToggle()
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

function! s:PushMark(is_global)
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
function! s:BookmarkLine(message, copy)
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

if !exists("g:tmux_send_target")
  let g:tmux_send_target = ".+1"
endif
function! s:TmuxSend(type)
  let l:sel_save = &selection
  let l:reg_save = @@
  let &selection = "inclusive"

  if a:type == 'line'
    silent normal! '[V']y
  elseif a:type == 'char'
    silent normal! `[v`]y
  else
    silent normal! gvy
  endif

  let l:tt_send = "tt -t " . shellescape(g:tmux_send_target) . " "
  let l:lines = split(@@, '\n')
  for l:line in l:lines
    call system(l:tt_send . shellescape(l:line))
  endfor

  let @@ = l:reg_save
  let &selection = l:sel_save
endfunction

function! SearchAround(start_tag, end_tag, ...)
  let l:pos_save = getpos('.')
  let l:line = line('.')
  let l:pos_end = searchpos(a:end_tag, 'W', l:line)
  let l:pos_start = searchpos(a:start_tag, 'bW', l:line)
  call cursor(l:pos_save[1], l:pos_save[2])

  " Add a dummy third argument to search after current position.
  if l:pos_end[0] == l:line && l:pos_start[0] == l:line && (a:0 > 0 || l:pos_start[1] <= l:pos_save[2])
    return strpart(getline('.'), l:pos_start[1] + len(a:start_tag) - 1, l:pos_end[1] - l:pos_start[1] - len(a:start_tag))
  endif
  return ''
endfunction

function! s:FollowWikiLink()
  let l:line_text = getline('.')

  let l:wikilink = SearchAround('[[', ']]')
  if l:wikilink == ''
    echomsg 'WikiLink not found' | return
  endif

  let l:filename = split(l:wikilink, '|')[0]
  if l:filename =~ '^\./'
    let l:filename = l:filename[2:]
  endif
  if has('ios')
    let g:ctrlp_default_input = l:filename
    try
      call ctrlp#init(0)
    finally
      let g:ctrlp_default_input = 0
    endtry
  else
    call fzf#vim#files('', {'options':['-1', '-q', l:filename]})
  endif
endfunction

function! s:CopyAsWikiLink()
  let l:basename = expand('%:t')
  if l:basename =~ '\.md$'
    let l:basename = l:basename[:-4]
  endif
  let @@ = printf('[[%s]]', l:basename)
endfunction

function! s:Bufs()
  redir => list
  silent ls
  redir END
  return split(list, "\n")
endfunction

" Use %f as the base bufname, e.g., brain[%f]
command! -nargs=1 Trename call s:TabRename(<q-args>)
command! -nargs=1 Tnew tabnew! | call s:TabRename(<q-args>)
command! -nargs=0 Treset call s:TabReset('')

command! DiffOrig vert new | set bt=nofile | r # | 0d_ | diffthis
      \ | wincmd p | diffthis
command! Close :pclose | :cclose | :lclose |
      \ let s:currentWindow = winnr() |
      \ :windo call s:CloseDisturbingWin() |
      \ exe s:currentWindow . "wincmd w"
command! Diffoff :diffoff! | :windo call s:CloseReadonlyWin() | :Close
command! Reload :source ~/.vimrc | :filetype detect | :nohl
command! -bang Clear :silent! %bw<bang> | :silent! argd * | :nohl
command! -nargs=* Diff2qf :cexpr system("diff2qf", system("git diff -U0 " . <q-args>))

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
command! -bang -nargs=* Bm call <SID>BookmarkLine(<q-args>, <bang>0)
command! Bw call fzf#run(fzf#wrap({
  \ 'source': <SID>Bufs(),
  \ 'sink*': { lines -> execute('bwipeout '.join(map(lines, {_, line -> split(line)[0]}))) },
  \ 'options': '--multi --reverse --bind ctrl-a:select-all+accept'
\ }))

if has('win32') || has('ios')
  command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile | silent file __viper__ | nnoremap <buffer> <CR> ggvGg_"+y:%d <lt>Bar> redraw!<lt>CR>
else
  command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile | silent file __viper__ | nnoremap <buffer> <CR> :exec "w !ctrlc" <lt>Bar> %d <lt>Bar> redraw!<lt>CR>
end

" Config {{{1
set autoindent
set autoread
set backspace=indent,eol,start
set backup
set backupdir=~/.vim/backup//,.
set breakindent
set cursorline
set copyindent
set directory=~/.vim/swap//,/tmp//,.
set display+=lastline
set expandtab
set nofoldenable
set foldtext=MyFoldText()
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
set listchars=tab:▸\ ,trail:·,extends:»,precedes:«,nbsp:␣
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
if &term != 'win32'
  set statusline=%<%{StatusLineFileName()}\ %h%m%r%{HasPaste()}%=%{StatusLineFileFormat()}\ %l\ %P
endif
set tabline=%!Tabline()
set tabpagemax=50
set title
set undodir=~/.vim/undo//,/tmp//,.
set undofile
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
  set cscopequickfix+=a-
endif
if s:has_rg
  set grepformat=%f:%l:%c:%m
  set grepprg=rg\ --hidden\ -g\ '!.git'\ --vimgrep\ $*
endif

let $cb = $HOME . '/codebase'
let $kb = $HOME . '/codebase/my/knowledge-base'

runtime! macros/matchit.vim

" Keymap {{{1
" leader
let mapleader = " "
let g:mapleader = " "
let maplocalleader = "\\"
let g:maplocalleader = "\\"
set pastetoggle=<F2>
set wildcharm=<C-Z>

nnoremap <silent> t<CR> :TestNearest<CR>
nnoremap <silent> g<CR> :Dispatch<CR>

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
nnoremap <silent> <Leader>en :enew<CR>
nnoremap <silent> <Leader>et :tabnew<CR>
nnoremap <Leader>ee :e <C-r>=expand("%:r")<CR><C-Z>
nnoremap <Leader>eb :sview `=expand("~/.vim/backup/") . substitute(expand("%:p"), "[\\\\/]", "%", "g") . "~"`<CR>
nnoremap <silent> <Leader>ev :tabnew ~/.vimrc<CR>
nnoremap <Leader>e<Space> :e<Space><C-Z>
nnoremap <silent> <Leader>ep :tabnew .projections.json<CR>
nnoremap <Leader>es :e ~/.vim/UltiSnips/<C-Z>
nnoremap <Leader>eS :UltiSnipsEdit<CR>
nnoremap <Leader>ed :e ~/.diary/<C-R>=strftime('%Y-%m-%d')<CR>.md<CR>
nnoremap <Leader>eD :FZF ~/.diary/<CR>
nnoremap <Leader>em :e ~/.diary/<C-R>=strftime('%Y-%m-%d', localtime() + 86400)<CR>.md<CR>
nnoremap <Leader>ey :e ~/.diary/<C-R>=strftime('%Y-%m-%d', localtime() - 86400)<CR>.md<CR>

nnoremap <silent> <Leader>fb :Buffers<CR>
nnoremap <silent> <Leader>fk :Bw<CR>
nnoremap <silent> <Leader>ff :Ffile<CR>
nnoremap <silent> <Leader>fd :Fdir<CR>
nnoremap <silent> <Leader>fo :BLines<CR>
nnoremap <silent> <Leader>fO :Lines<CR>
nnoremap <silent> <Leader>fr :History<CR>
nnoremap <silent> <Leader>fs :Snippets<CR>
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
nnoremap <silent> <Leader>K <C-^>:bd #<Bar>let @# = 1<CR>

noremap <silent> <Leader>ll :25Lexplore<CR>
noremap <silent> <Leader>la :args<CR>
noremap <silent> <Leader>lj :jumps<CR>
noremap <silent> <Leader>lt :tags<CR>
noremap <silent> <Leader>lT :tabs<CR>
noremap <silent> <Leader>lr :registers<CR>
noremap <silent> <Leader>lb :ls<CR>:b<Space>
noremap <silent> <Leader>lm :marks<CR>:normal! `

nnoremap <silent> <Leader>m :call <SID>PushMark(0)<CR>
nnoremap <silent> <Leader>M :call <SID>PushMark(1)<CR>

nnoremap <silent> <Leader>n :nohlsearch<CR>

nnoremap <Leader>o<Space> :vimgrep //g %<Left><Left><Left><Left>
nnoremap <silent> <Leader>ow :silent vimgrep /\<<C-r><C-w>\>/ %<Bar>copen 10<CR>
nnoremap <silent> <Leader>oW :silent vimgrep /\<<C-r><C-a>\>/ %<Bar>copen 10<CR>

nnoremap <Leader>p "+p
nnoremap <Leader>P "+P

nnoremap <silent> <Leader>q :call <SID>QFixToggle()<CR>

" Reveal
nnoremap <silent> <Leader>ri :call <SID>FollowWikiLink()<CR>
nnoremap <silent> <Leader>rI :call <SID>CopyAsWikiLink()<CR>
nnoremap <silent> <Leader>rt :exe "silent !open -a 'Terminal.app' " . shellescape(CurDir()) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rf :exe "silent !open -R " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rm :exe "silent !open -a 'Marked 2.app' " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rM :exe "silent !open -a 'Marked 2.app' " . shellescape(CurDir()) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>rr :exe "silent !open " . shellescape(expand('%')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>ro :exe "silent !open " . shellescape(expand('<cfile>')) . " &> /dev/null" \| :redraw!<CR>
nnoremap <silent> <Leader>R :checktime<CR>

" Strip all trailing whitespace from a file
nnoremap <Leader>ss :source ~/.vim/scripts/<C-Z>
nnoremap <silent> <Leader>sw :let _s=@/<Bar>%s/\s\+$//e<Bar>let @/=_s<Bar>unlet _s<Bar>nohl<CR>

nnoremap <Leader>tq :Copen<CR>
nnoremap <silent> <Leader>tf :TestFile<CR>
nnoremap <silent> <Leader>ts :TestSuite<CR>
nnoremap <silent> <Leader>tt :TestLast<CR>
nnoremap <silent> <Leader>te :TestVisit<CR>

nnoremap <Leader>th :tabnew <C-r>=CurDir().'/'<CR>
nnoremap <Leader>td :tabnew <C-r>=CurDir().'/'<CR><CR>
nnoremap <silent> <Leader>tn :tabnew<CR>

nnoremap <Leader>u :MundoToggle<CR>
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

inoremap <expr> <C-r><C-h> fzf#vim#complete#path('cd ' . shellescape(expand('%:p:h')) . ' && rg --files')
inoremap <expr> <C-r><C-f> fzf#vim#complete#path('cd ' . shellescape(getcwd()) . ' && rg --files')
inoremap <expr> <C-r><C-i> fzf#vim#complete#path('cd ' . shellescape(getcwd()) . ' && rg -g "*.md" --files')

" OS specific settings {{{1
if has('win32')
  let &shell = executable("pwsh.exe") ? "pwsh.exe" : "powershell.exe"
  set shellcmdflag=-NoLogo\ -NoProfile\ -NonInteractive\ -Command
  set shellquote=\"
  set shellxquote=
  set shellslash
  let g:fzf_preview_window = ''
  call setenv('FZF_DEFAULT_OPTS', '--color 16')
end

if exists('$WSLENV')
  let g:netrw_browsex_viewer= "wsl-open"
endif

if has("ios")
  set backupcopy=yes
  set noundofile
  let g:ctrlp_root_markers = []
  let g:ctrlp_working_path_mode = 'a'
  nnoremap <Leader><Space> :CtrlP<CR>
  nnoremap <silent> <Leader>b :CtrlPBuffer<CR>
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

  autocmd BufReadPost *
    \ if line("'\"") > 1 && line("'\"") <= line("$") && &filetype != "gitcommit" |
    \   exe "normal! g`\"" |
    \ endif

  autocmd SwapExists * let v:swapchoice = "o"

  autocmd User ProjectionistActivate call s:ProjectionistActivate()

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
  autocmd User GoyoEnter Limelight
  autocmd User GoyoLeave Limelight!
augroup END

silent! source ~/.vim/UltiSnips/abbreviations.vim
silent! source ~/.vimrc.local
