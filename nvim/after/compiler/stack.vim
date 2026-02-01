" Tell dispatch to use this compiler
" CompilerSet makeprg=stack
" Doctest failure format
CompilerSet errorformat+=%f:%l:\ failure\ %m
" Ignore <interactive> lines from GHCi output
CompilerSet errorformat+=%-Gbut\ got:\ <interactive>\|%#
CompilerSet errorformat+=%-G<interactive>\|%#