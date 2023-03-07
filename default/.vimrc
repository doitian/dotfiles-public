" Preamble {{{1
set guicursor=
set nocompatible
set encoding=utf-8
let loaded_matchparen = 1
let &background = $TERM_BACKGROUND !=# '' ? $TERM_BACKGROUND : 'light'
if $SSH_HOME !=# '' | let $HOME = $SSH_HOME | endif
if has('win32') | language en | set ff=unix | endif
if &term ==? 'win32' | set t_Co=256 | endif

" Plug {{{1
silent! call plug#begin($HOME.'/.vim/plugged')

" filetypes
Plug 'cespare/vim-toml'
Plug 'plasticboy/vim-markdown'
Plug 'nathangrigg/vim-beancount'

" other
Plug 'NLKNguyen/papercolor-theme'

Plug 'christoomey/vim-titlecase'
Plug 'dyng/ctrlsf.vim', { 'on': 'CtrlSF' }
Plug 'editorconfig/editorconfig-vim'
Plug 'godlygeek/tabular', { 'on': 'Tabularize', 'for': ['markdown'] }
Plug 'janko-m/vim-test', { 'on': ['TestNearest', 'TestFile', 'TestSuite', 'TestLast', 'TestVisit'] }
Plug 'junegunn/fzf'
Plug 'junegunn/fzf.vim'
Plug 'junegunn/goyo.vim', { 'on': 'Goyo' }
Plug 'junegunn/limelight.vim', { 'on': 'Limelight' }
Plug 'sbdchd/neoformat', { 'on': 'Neoformat' }
Plug 'simnalamburt/vim-mundo', { 'on': 'MundoToggle' }
Plug 'thinca/vim-visualstar' " * # g* g#
Plug 'tommcdo/vim-exchange' " cx
Plug 'tomtom/tcomment_vim' " gc
Plug 'tpope/vim-abolish' " cr :A :S
Plug 'tpope/vim-dispatch', { 'on': ['FocusDispatch', 'Dispatch', 'Start'] }
Plug 'tpope/vim-obsession'
Plug 'tpope/vim-projectionist'
Plug 'tpope/vim-repeat'
Plug 'tpope/vim-sleuth'
Plug 'tpope/vim-surround' " ys s
Plug 'tpope/vim-unimpaired' " various [, ] mappings
Plug 'wellle/targets.vim' " Text objects

if has('win32')
  Plug 'PProvost/vim-ps1'
endif

if has('python3')
  Plug 'SirVer/ultisnips'
endif

if has('nvim')
  call LoadNvimPlugs()
  delfunction LoadNvimPlugs
endif

call plug#end()

" Theme {{{1
syntax on

let g:PaperColor_Theme_Options = {
      \   'theme': {
      \     'default': {
      \       'allow_bold': 1,
      \       'allow_italic': 1
      \     }
      \   }
      \ }
silent! colorscheme PaperColor

" Plugins Options {{{1
let test#strategy = 'dispatch'

let g:cargo_makeprg_params = 'check --all --all-targets'
let g:ctrlsf_default_root = 'cwd'
let g:dispatch_compilers = {
      \ 'bundle exec': ''}
let g:fzf_buffers_jump = 1
let g:fzf_layout = { 'down': '40%' }
let g:go_fmt_fail_silently = 1
let g:netrw_banner = 0
let g:netrw_liststyle = 3
let g:netrw_browse_split = 4 " open in prior window
let g:netrw_altv = 1 " split to the right
let g:shfmt_opt="-ci"
let g:UltiSnipsEditSplit = 'tabdo'
let g:UltiSnipsListSnippets = '<c-f>'
let g:UltiSnipsSnippetDirectories = [ $HOME.'/.vim/UltiSnips' ]
let g:vim_markdown_frontmatter = 1
let g:vim_markdown_math = 1
let g:vim_markdown_strikethrough = 1

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
    let title = rename !=# '' ? substitute(rename, '\C%f', bufname, 'g') : (bufname !=# '' ? bufname : 'No Name')
    let bufmodified = getbufvar(bufnr, '&mod')

    let s .= '%' . tab . 'T'
    let s .= (tab ==# tabpagenr() ? '%#TabLineSel#' : '%#TabLine#')
    let s .= ' ' . tab . ':'
    let s .= '[' . title . (bufmodified ? ']+ ' : '] ')
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
  if &filetype !=# 'netrw'
    return &buftype !=# 'nofile' ? pathshorten(expand('%:~:.')) : expand('%')
  elseif b:netrw_curdir ==? getcwd()
    return './'
  else
    return pathshorten(fnamemodify(b:netrw_curdir, ':~:.')) . '/'
  endif
endfunction

function! StatusLineFileFormat()
  let l:flags = []

  let l:encoding = &fileencoding !=# '' ? &fileencoding : &encoding
  if l:encoding !=# 'utf-8' | call add(l:flags, l:encoding) | endif
  if &bomb | call add(l:flags, '+bomb') | endif
  if &fileformat !=# 'unix' | call add(l:flags, printf('[%s]', &fileformat)) | endif
  return join(l:flags, '')
endfunction

function! s:QFixToggle()
  if &filetype ==# 'qf'
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
  let line = substitute(line, "\t", onetab, 'g')

  let line = strpart(line, 0, windowwidth - 2 -len(foldedlinecount))
  let fillcharcount = windowwidth - len(line) - len(foldedlinecount) - 4
  return line . ' …' . repeat(' ',fillcharcount) . foldedlinecount . ' '
endfunction

let s:DisturbingFiletypes = { 'help': 1, 'netrw': 1, 'vim-': 1,
      \ 'godoc': 1, 'git': 1, 'man': 1 }

function! s:CloseDisturbingWin()
  if ((&filetype ==# '' && &diff !=# 1) || has_key(s:DisturbingFiletypes, &filetype)) && !&modified
    let l:currentWindow = winnr()
    if s:currentWindow > l:currentWindow
      let s:currentWindow = s:currentWindow - 1
    endif
    if winnr('$') ==# 1 | enew | else | close | endif
  endif
endfunction

function! s:CloseReadonlyWin()
  if &readonly
    if winnr('$') ==# 1 | enew | else | close | endif
  endif
endfunction

function! CurDir()
  if &filetype !=# 'netrw'
    let l:dir = expand('%:h')
    if l:dir !=# ''
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

if !exists('g:bookmark_line_insert_newline')
  let g:bookmark_line_insert_newline = 0
  let g:bookmark_line_prefix = ''
endif
function! s:BookmarkLine(message, copy)
  let l:line = g:bookmark_line_prefix . expand('%') . '|' . line('.') . ' col ' . col('.') . '| '
  if a:message ==# ''
    let l:line = l:line . getline('.')
  else
    let l:line = l:line . a:message
  endif
  if g:bookmark_line_insert_newline
    let l:list = ['', l:line]
  else
    let l:list = [l:line]
  endif
  call writefile(l:list, 'bookmarks.qf', 'a')
  if a:copy
    let @+ = join(l:list)
  endif
endfunction

function! Opfunc(type = '') abort
  if type(a:type) ==# v:t_func
    set opfunc=Opfunc
    let g:OpfuncDo = a:type
    return 'g@'
  endif

  let sel_save = &selection
  let reg_save = getreginfo('"')
  let cb_save = &clipboard
  let visual_marks_save = [getpos("'<"), getpos("'>")]

  try
    set clipboard= selection=inclusive
    let commands = #{line: "'[V']y", char: "`[v`]y", block: "`[\<c-v>`]y"}
    silent exe 'noautocmd keepjumps normal! ' .. get(commands, a:type, 'gvy')

    call g:OpfuncDo()
  finally
    call setreg('"', reg_save)
    call setpos("'<", visual_marks_save[0])
    call setpos("'>", visual_marks_save[1])
    let &clipboard = cb_save
    let &selection = sel_save
  endtry
endfunction

function! TmuxSend(lines = @")
  if !exists('g:tmux_send_target')
    let g:tmux_send_target = trim(system('tt -h -p'))
  endif
  let l:tt_send = 'tt -t ' . shellescape(trim(g:tmux_send_target)) . ' '
  for l:line in split(a:lines, "\n")
    call system(l:tt_send . shellescape(l:line))
  endfor
endfunction

function! s:Preview(bufname, filetype, lines)
  exec 'silent! pedit! +setlocal\ ' .
        \ 'filetype=' .. a:filetype .. '\ ' .
        \ 'buftype=nofile\ bh=wipe\ noswapfile ' .
        \ fnameescape(a:bufname)

  let l:nr = winnr()
  silent! wincmd P
  if &previewwindow
    %delete | call setline(1, a:lines)
    exec l:nr .. "wincmd w"
  endif
endfunction

function! System(lines = @")
  let l:list = split(a:lines, "\n")
  let l:bufname = '$ ' .. l:list[-1]
  let l:preview = l:list + ['', 'cat << "OUTPUT"'] + systemlist(a:lines) + ['OUTPUT']
  call s:Preview(l:bufname, 'sh', l:preview)
endfunction

function! Pipe(lines = @")
  let l:shellcmd = input('> ', '', 'shellcmd')
  if l:shellcmd !=# ''
    call System('echo -n ' .. shellescape(a:lines) .. " |\n" .. l:shellcmd)
  endif
endfunction

function! SystemReplace(lines = @")
  let reg_save = getreginfo('"')
  let @" = join(systemlist(a:lines), "\n")
  silent exe "noautocmd keepjumps normal! gv\"_c\<c-r>\"\<esc>"
  call setreg('"', reg_save)
endfunction

function! PipeReplace(lines = @")
  let l:shellcmd = input('< ', '', 'shellcmd')
  if l:shellcmd !=# ''
    let reg_save = getreginfo('"')
    let @" = join(systemlist(l:shellcmd, a:lines), "\n")
    silent exe "noautocmd keepjumps normal! gv\"_c\<c-r>\"\<esc>"
    call setreg('"', reg_save)
  endif
endfunction

function! SearchAround(start_tag, end_tag, ...)
  let l:pos_save = getpos('.')
  let l:line = line('.')
  let l:pos_end = searchpos(a:end_tag, 'W', l:line)
  let l:pos_start = searchpos(a:start_tag, 'bW', l:line)
  call cursor(l:pos_save[1], l:pos_save[2])

  " Add a dummy third argument to search after current position.
  if l:pos_end[0] ==# l:line && l:pos_start[0] ==# l:line && (a:0 > 0 || l:pos_start[1] <= l:pos_save[2])
    return strpart(getline('.'), l:pos_start[1] + len(a:start_tag) - 1, l:pos_end[1] - l:pos_start[1] - len(a:start_tag))
  endif
  return ''
endfunction

function! s:FollowWikiLink()
  let l:line_text = getline('.')

  let l:wikilink = SearchAround('[[', ']]')
  if l:wikilink ==# ''
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
    call fzf#vim#files('', {'options':['-1', '-e', '-q', substitute(l:filename, ' ', '\\ ', 'g')]})
  endif
endfunction

function! s:CopyAsWikiLink()
  let l:basename = expand('%:t')
  if l:basename =~ '\.md$'
    let l:basename = l:basename[:-4]
  endif
  let @" = printf('[[%s]]', l:basename)
endfunction

function! s:Bufs()
  redir => list
  silent ls
  redir END
  return split(list, "\n")
endfunction

function! s:ZoteroCite()
  " pick a format based on the filetype (customize at will)
  let format = &filetype =~ '.*tex' ? 'citep' : 'pandoc'
  let api_call = 'http://127.0.0.1:23119/better-bibtex/cayw?format='.format.'&brackets=1'
  let ref = system('curl -s '.shellescape(api_call))
  return ref
endfunction

function! s:Italic(enable)
  if a:enable
    hi Comment cterm=italic gui=italic
    hi Folded cterm=italic gui=italic
    let &t_ZH = "\e[3m"
    let &t_ZR = "\e[23m"
  else
    hi Comment cterm=none gui=none
    hi Folded cterm=none gui=none
    let &t_ZH = ''
    let &t_ZR = ''
  endif
endfunction
call s:Italic(1)

" Use %f as the base bufname, e.g., brain[%f]
command! -nargs=1 Trename call s:TabRename(<q-args>)
command! -nargs=1 Tnew tabnew! | call s:TabRename(<q-args>)
command! -nargs=0 Treset call s:TabReset('')

command! ItalicEnable call s:Italic(1)
command! ItalicDisable call s:Italic(0)

command! DiffOrig vert new | set bt=nofile | r # | 0d_ | diffthis
      \ | wincmd p | diffthis
command! Close :pclose | :cclose | :lclose |
      \ let s:currentWindow = winnr() |
      \ :windo call s:CloseDisturbingWin() |
      \ exe s:currentWindow . 'wincmd w'
command! Diffoff :diffoff! | :windo call s:CloseReadonlyWin() | :Close
command! Reload :source $HOME/.vimrc | :filetype detect | :nohl
command! -bang Clear :silent! %bdelete | :silent! argd * | :nohl
command! -nargs=* Diff2qf :cexpr system('diff2qf', system('git diff -U0 ' . <q-args>))

command! -bang FasdCd call fzf#run(fzf#wrap('fasd -d', {'source': 'fasd -lRd', 'sink': 'cd'}, <bang>0))
command! -bang FasdLcd call fzf#run(fzf#wrap('fasd -d', {'source': 'fasd -lRd', 'sink': 'lcd'}, <bang>0))
command! -bang FasdDir call fzf#run(fzf#wrap('fasd -d', {'source': 'fasd -lRd'}, <bang>0))
command! -bang FasdFile call fzf#run(fzf#wrap('fasd -f', {'source': 'fasd -lRf'}, <bang>0))

let g:fd_alt_c_command = 'fd --type d --no-ignore --hidden --follow --exclude ".git" . '
command! -bang -nargs=? FzfCd call fzf#run(fzf#wrap('fd -t d', {'source': g:fd_alt_c_command . <q-args>, 'sink': 'cd'}, <bang>0))
command! -bang -nargs=? FzfLcd call fzf#run(fzf#wrap('fd -t d', {'source': g:fd_alt_c_command . <q-args>, 'sink': 'lcd'}, <bang>0))

command! -nargs=1 -complete=file Cfile let &errorformat = g:bookmark_line_prefix . '%f|%l col %c| %m' | cfile <args>
command! -nargs=1 -complete=file Lfile let &errorformat = g:bookmark_line_prefix . '%f|%l col %c| %m' | lfile <args>
command! -bang -nargs=* Bm call <SID>BookmarkLine(<q-args>, <bang>0)
command! Bd call fzf#run(fzf#wrap({
  \ 'source': <SID>Bufs(),
  \ 'sink*': { lines -> execute('bdelete '.join(map(lines, {_, line -> split(line)[0]}))) },
  \ 'options': '--multi --reverse --bind ctrl-a:select-all+accept'
\ }))

command! -nargs=* -complete=shellcmd TmuxSend call TmuxSend(<q-args>)
command! -nargs=* -complete=shellcmd System call System(<q-args>)

command! Delete call delete(expand('%')) | bdelete | let @# = 1
command! -nargs=1 -complete=file Move saveas <args> | call delete(expand('#')) | exec "bdelete #" | let @# = 1

if has('win32') || has('ios')
  command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile | silent file __viper__ | nnoremap <buffer> <CR> ggvGg_"+y:%d <lt>Bar> redraw!<lt>CR>
else
  command! Viper setlocal bin noeol noswapfile ft=markdown buftype=nofile | silent file __viper__ | nnoremap <buffer> <CR> :exec 'w !ctrlc' <lt>Bar> %d <lt>Bar> redraw!<lt>CR>
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
set copyindent
set directory=$HOME/.vim/files/swap//,.
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
set list
set report=0
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
set splitbelow
set splitright
set switchbuf=useopen
set synmaxcol=200
set tabline=%!Tabline()
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
  let &listchars = 'tab:▸ ,trail:·,extends:»,precedes:«,nbsp:␣'
  let &fillchars = 'foldopen:▾,foldsep:⏐,foldclose:▸,vert:╎'
else
  let &listchars = 'tab:> ,trail:.,extends:>,precedes:<,nbsp:.'
  let &fillchars = 'foldopen:v,foldsep:|,foldclose:>,vert:|'
endif
set statusline=%<%{StatusLineFileName()}\ %h%m%r%{HasPaste()}%=%{StatusLineFileFormat()}\ \#%n\ L%l:%c\ %P
set undodir=$HOME/.vim/files/undo//
if has('nvim') | set undodir=$HOME/.vim/files/nvim-undo// | endif

let $cb = $HOME . '/codebase'
let $kb = $HOME . '/Dropbox/Brain'

runtime! macros/matchit.vim

" Keymap {{{1
" leader
let mapleader = ' '
let g:mapleader = ' '
let maplocalleader = '\\'
let g:maplocalleader = '\\'
set pastetoggle=<F2>
set wildcharm=<C-Z>

nnoremap <silent> t<CR> :TestNearest<CR>
nnoremap <silent> g<CR> :Dispatch<CR>
nnoremap <silent> f<CR> :Neoformat<Bar>up<CR>
vmap R <Plug>(abolish-coerce)

nnoremap <Leader><Space> :Files<CR>
nnoremap <Leader>? :Maps<CR>'<lt>Space>

nnoremap <Leader>a :A<CR>

nnoremap <silent> <Leader>b :Buffers<CR>

nnoremap <Leader>cw :pwd<CR>
nnoremap <Leader>cb :cd -<bar>pwd<CR>
nnoremap <Leader>ch :cd <C-r>=CurDir().'/'<CR>
nnoremap <Leader>lch :lcd <C-r>=CurDir().'/'<CR>
nnoremap <Leader>c<Space> :cd<Space><C-Z>
nnoremap <Leader>lc<Space> :lcd<Space><C-Z>
nnoremap <Leader>css :colorscheme PaperColor<CR>
nnoremap <Leader>csd :colorscheme default<CR>
nnoremap <silent> <Leader>cc :let @+ = @"<CR>
nnoremap <silent> <Leader>cv :let @" = @+<CR>

nnoremap <silent> <Leader>d "_d
xnoremap <silent> <Leader>d "_d
nnoremap <silent> <Leader>D :Diffoff<CR>

nnoremap <Leader>eh :e <C-r>=CurDir().'/'<CR>
nnoremap <silent> <Leader>en :enew<CR>
nnoremap <silent> <Leader>et :tabnew<CR>
nnoremap <Leader>ee :e <C-r>=expand('%:r')<CR><C-Z>
nnoremap <Leader>eb :sview `=expand($HOME.'/.vim/files/backup/') . substitute(expand('%:p'), '[\\\\/]', '%', 'g') . '-vimbackup'`<CR>
nnoremap <silent> <Leader>ev :tab drop $HOME/.vimrc<CR>
nnoremap <Leader>ew :e<Space>**/
nnoremap <Leader>e<Space> :e<Space><C-Z>
nnoremap <silent> <Leader>ep :tab drop .projections.json<CR>
nnoremap <silent> <Leader>ef :tab drop .index.md<CR>
nnoremap <Leader>es :tab drop $HOME/.vim/UltiSnips/<C-Z>
nnoremap <Leader>eS :UltiSnipsEdit<CR>
nnoremap <Leader>ej :tab drop $HOME/.journal/Journal <C-R>=strftime('%Y-%m-%d')<CR>.md<CR>
nnoremap <Leader>eJ :Files $HOME/.journal/<CR>

nnoremap <silent> <Leader>fb :Buffers<CR>
nnoremap <silent> <Leader>fk :Bd<CR>
nnoremap <silent> <Leader>ff :FasdFile<CR>
nnoremap <silent> <Leader>fd :FasdDir<CR>
nnoremap <silent> <Leader>fo :BLines<CR>
nnoremap <silent> <Leader>fO :Lines<CR>
nnoremap <silent> <Leader>fr :History<CR>
nnoremap <silent> <Leader>fs :Snippets<CR>
nnoremap <silent> <Leader>f: :History:<CR>
nnoremap <silent> <Leader>f/ :History/<CR>
nnoremap <silent> <Leader>fm :Marks<CR>
nnoremap <silent> <Leader>fw :Windows<CR>
nnoremap <silent> <Leader>f? :Helptags<CR>
nnoremap <silent> <Leader>fz :FZF<CR>
nnoremap <Leader>fcd :FasdCd<CR>
nnoremap <Leader>flcd :FasdLcd<CR>

nnoremap <Leader>g<Space> :grep<Space>
nnoremap <silent> <Leader>gw :silent grep '\b<cword>\b'<Bar>copen 10<CR>
nnoremap <silent> <Leader>gW :silent grep '\b<cWORD>\b'<Bar>copen 10<CR>

nnoremap <silent> <Leader>h :Files <C-r>=CurDir()<CR><CR>

nnoremap <silent> <Leader>i :BTags<CR>
nnoremap <silent> <Leader>I :Tags<CR>

" j lsp

nnoremap <silent> <Leader>k :Close<CR>
nnoremap <silent> <Leader>K <C-^>:bdelete #<Bar>let @# = 1<CR>

" lc used in <Leader>c
nnoremap <silent> <Leader>ll :25Lexplore<CR>
nnoremap <silent> <Leader>la :args<CR>
nnoremap <silent> <Leader>ld :help digraph-table<CR>
nnoremap <silent> <Leader>lj :jumps<CR>
nnoremap <silent> <Leader>lt :tags<CR>
nnoremap <silent> <Leader>lT :tabs<CR>
nnoremap <silent> <Leader>lr :registers<CR>
nnoremap <silent> <Leader>lb :ls<CR>:b<Space>
nnoremap <silent> <Leader>lm :marks<CR>:normal! `

nnoremap <silent> <Leader>m :call <SID>PushMark(0)<CR>
nnoremap <silent> <Leader>M :call <SID>PushMark(1)<CR>

nnoremap <silent> <leader>n :nohlsearch<CR>

nnoremap <Leader>o<Space> :vimgrep //g %<Left><Left><Left><Left>
nnoremap <silent> <Leader>ow :silent vimgrep /\<<C-r><C-w>\>/ %<Bar>copen 10<CR>
nnoremap <silent> <Leader>oW :silent vimgrep /\<<C-r><C-a>\>/ %<Bar>copen 10<CR>

nnoremap <Leader>p "+p
nnoremap <Leader>P "+P

nnoremap <silent> <Leader>q :call <SID>QFixToggle()<CR>

" Reveal
nnoremap <silent> <Leader>ri :call <SID>FollowWikiLink()<CR>
nnoremap <silent> <Leader>rI :call <SID>CopyAsWikiLink()<CR>
nnoremap <silent> <Leader>rt :exe 'silent !open -a "Terminal.app" ' . shellescape(CurDir()) . ' &> /dev/null' \| :redraw!<CR>
nnoremap <silent> <Leader>rf :exe 'silent !open -R ' . shellescape(expand('%')) . ' &> /dev/null' \| :redraw!<CR>
nnoremap <silent> <Leader>rm :exe 'silent !open -a "Marked 2.app" ' . shellescape(expand('%')) . ' &> /dev/null' \| :redraw!<CR>
nnoremap <silent> <Leader>rM :exe 'silent !open -a "Marked 2.app" ' . shellescape(CurDir()) . ' &> /dev/null' \| :redraw!<CR>
nnoremap <silent> <Leader>rr :exe 'silent !open ' . shellescape(expand('%')) . ' &> /dev/null' \| :redraw!<CR>
nnoremap <silent> <Leader>ro :exe 'silent !open ' . shellescape(expand('<cfile>')) . ' &> /dev/null' \| :redraw!<CR>
nnoremap <silent> <Leader>R :checktime<CR>

nnoremap <Leader>ss :source $HOME/.vim/scripts/<C-Z>
" Strip all trailing whitespace from a file
nnoremap <silent> <Leader>sw :let _s=@/<Bar>%s/\s\+$//e<Bar>let @/=_s<Bar>unlet _s<Bar>nohl<CR>

nnoremap <Leader>tq :Copen<CR>
nnoremap <silent> <Leader>tf :TestFile<CR>
nnoremap <silent> <Leader>ts :TestSuite<CR>
nnoremap <silent> <Leader>tt :TestLast<CR>
nnoremap <silent> <Leader>te :TestVisit<CR>

nnoremap <Leader>th :tabnew <C-r>=CurDir().'/'<CR>
nnoremap <Leader>td :tabnew <C-r>=CurDir().'/'<CR><CR>
nnoremap <silent> <Leader>tn :tabnew<CR>
nnoremap <silent> <Leader>tz :tabnew %<CR>
nnoremap <silent> <Leader>tc :tabclose<CR>

nnoremap <Leader>u :MundoToggle<CR>
" Reselect text that was just pasted
nnoremap <Leader>v `[v`]

nnoremap <Leader>w <C-w>

nnoremap <expr> <Leader>x Opfunc(funcref('TmuxSend'))
xnoremap <expr> <Leader>x Opfunc(funcref('TmuxSend'))
nnoremap <expr> <Leader>xx Opfunc(funcref('TmuxSend')) .. '_'

nnoremap <Leader>y "+y
nnoremap <Leader>Y "+yy
xnoremap <Leader>y "+y

nnoremap <silent> <leader>z "=<SID>ZoteroCite()<CR>p
inoremap <C-r><C-z> <C-r>=<SID>ZoteroCite()<CR>

nnoremap <silent> <Leader>/t /\|.\{-}\|<CR>
nnoremap <Leader>/w /\<\><Left><Left>

nnoremap <silent> <Leader>] :call <SID>FollowWikiLink()<CR>
nnoremap <silent> <Leader>[ :call <SID>CopyAsWikiLink()<CR>

nnoremap <Leader>$<Space> :System<Space>
nnoremap <expr> <Leader>$ Opfunc(funcref('System'))
xnoremap <expr> <Leader>$ Opfunc(funcref('System'))
nnoremap <expr> <Leader>$$ Opfunc(funcref('System')) .. '_'

nnoremap <expr> <Leader>> Opfunc(funcref('Pipe'))
xnoremap <expr> <Leader>> Opfunc(funcref('Pipe'))
nnoremap <expr> <Leader>>> Opfunc(funcref('Pipe')) .. '_'

nnoremap <expr> <Leader>% Opfunc(funcref('SystemReplace'))
xnoremap <expr> <Leader>% Opfunc(funcref('SystemReplace'))
nnoremap <expr> <Leader>%% Opfunc(funcref('SystemReplace')) .. '_'

nnoremap <expr> <Leader>< Opfunc(funcref('PipeReplace'))
xnoremap <expr> <Leader>< Opfunc(funcref('PipeReplace'))
nnoremap <expr> <Leader><< Opfunc(funcref('PipeReplace')) .. '_'

cnoremap <C-r><C-d> <C-r>=CurDir().'/'<CR>
inoremap <C-r><C-d> <C-r>=CurDir().'/'<CR>

inoremap <expr> <C-r><C-h> fzf#vim#complete#path('cd ' . shellescape(expand('%:p:h')) . ' && fd -t f')
inoremap <expr> <C-r><C-f> fzf#vim#complete#path('cd ' . shellescape(getcwd()) . ' && fd -t f')

" OS specific settings {{{1
if has('win32')
  call setenv('FZF_DEFAULT_OPTS', '--color 16')
end

if exists('$WSLENV')
  let g:netrw_browsex_viewer= 'wsl-open'
endif

if has('ios')
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

  autocmd FileType gitcommit,markdown,text setlocal spell
  autocmd FileType markdown set fo+=ro suffixesadd=.md
  autocmd FileType rust setlocal winwidth=99
  autocmd FileType vim,beancount,i3config setlocal foldmethod=marker
  " Edit qf: setlocal ma | cgetb
  autocmd FileType qf setlocal errorformat=%f\|%l\ col\ %c\|%m

  autocmd BufNewFile,BufRead *.bats set ft=bats.sh
  autocmd BufNewFile,BufRead .envrc set ft=envrc.sh
  autocmd BufNewFile,BufRead *.tid set ft=markdown
  autocmd BufNewFile,BufRead */gopass-*/* set ft=gopass
  au BufNewFile,BufRead */gopass-*/* setlocal noswapfile nobackup noundofile
  autocmd BufNewFile,BufRead PULLREQ_EDITMSG set ft=gitcommit

  autocmd BufReadPost *
    \ if line("'\"") > 1 && line("'\"") <= line('$') && &filetype !=# 'gitcommit' |
    \   exe 'normal! g`"' |
    \ endif
  autocmd SwapExists * let v:swapchoice = 'o'
  autocmd CmdwinEnter * map <buffer> <C-w><C-w> <CR>q:dd

  autocmd User ProjectionistActivate silent! call s:ProjectionistActivate()
  autocmd User GoyoEnter Limelight
  autocmd User GoyoLeave Limelight!
augroup END

if executable('fasd')
  function! s:FasdUpdate() abort
    if empty(&buftype)
      let l:path = &filetype ==# 'netrw' ? b:netrw_curdir : expand('%:p')
      let l:comm = ['fasd', '-A', l:path]
      if has('nvim') | call jobstart(l:comm) | else | call job_start(l:comm) | endif
    endif
  endfunction
  augroup fasd
    autocmd!
    autocmd BufWinEnter,BufFilePost * call s:FasdUpdate()
  augroup END
endif

silent! source $HOME/.vim/UltiSnips/abbreviations.vim
silent! source $HOME/.vimrc.local
