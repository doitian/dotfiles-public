setlocal suffixesadd=.md
let &l:includeexpr = 'substitute(v:fname,"^\\[*\\([^\\]|]*\\).*","\\1","")'

nmap <buffer> <Leader>ss <Leader>si

if getline(2) =~# "^cards-deck:"
  let b:autoformat = v:false
endif

let b:undo_ftplugin .= '|setl sua< isf< fdl< inex<|sil! nunmap <buffer> <Leader>ss|unlet! b:autoformat'
