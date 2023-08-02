let s:cpo_save = &cpo
set cpo&vim

" ------------------------------------------------------------------
" Common
" ------------------------------------------------------------------
" https://github.com/junegunn/fzf.vim/blob/master/autoload/fzf/vim.vim

function! s:warn(message)
  echohl WarningMsg
  echom a:message
  echohl None
  return 0
endfunction

function! s:strip(str)
  return substitute(a:str, '^\s*\|\s*$', '', 'g')
endfunction

function! s:inject_snippet(line)
  let snip = split(a:line, "\t")[0]
  execute 'normal! a'.s:strip(snip)."\<Plug>(vsnip-expand)"
endfunction

" ------------------------------------------------------------------
" Files
" ------------------------------------------------------------------
function! fzf#vsnip#complete(...)
  if !exists(':VsnipOpen')
    return s:warn('Vsnip not found')
  endif

  let candidates = vsnip#get_complete_items(bufnr('%'))
  if empty(candidates)
    return s:warn('No snippets available here')
  endif
  let keywidth = 0
  for snip in candidates
    let keywidth = max([keywidth, len(snip['word'])])
  endfor

  let colored = map(candidates, { _, val -> printf("\x1b[32m%-".keywidth."s\x1b[m\t%s", val['word'], val['menu']) })
  call fzf#run(fzf#wrap('snippets', {
  \ 'source':  colored,
  \ 'options': '--ansi --tiebreak=index +m -n 1,.. -d "\t"',
  \ 'sink': function('s:inject_snippet')}, a:1))
endfunction

let &cpo = s:cpo_save
unlet s:cpo_save
