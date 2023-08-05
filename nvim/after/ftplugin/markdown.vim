setlocal suffixesadd=.md
setlocal isfname+=32
setlocal tabstop=4 shiftwidth=4
let &l:includeexpr = 'substitute(v:fname,"^\\[*\\([^\\]|]*\\).*","\\1","")'
