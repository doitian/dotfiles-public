setlocal suffixesadd=.md
setlocal isfname+=32
let &l:includeexpr = 'substitute(v:fname,"^\\[*\\([^\\]|]*\\).*","\\1","")'
