" Vim compiler file
" Compiler:	quickfix
" Maintainer:	ian

if exists('current_compiler')
  finish
endif
let current_compiler = 'quickfix'

if exists(':CompilerSet') != 2
  command -nargs=* CompilerSet setlocal <args>
endif

CompilerSet errorformat=%f\|%l\ col\ %c\|\ %m

" vim: sw=2 sts=2 et
