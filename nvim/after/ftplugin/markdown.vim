setlocal suffixesadd=.md
setlocal isfname+=32
setlocal foldlevel=1
let &b:includeexpr = 'substitute(v:fname,"^\\[*\\([^\\]|]*\\).*","\\1","")'

if getline(2) =~# "^cards-deck:"
  let b:autoformat = v:false
endif
