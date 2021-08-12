" Vim compiler file
" Compiler:     codespell
" CodeSpell Home:	https://github.com/codespell-project/codespell/

if exists("current_compiler")
  finish
endif
let current_compiler = "codespell"

if exists(":CompilerSet") != 2		" older Vim always used :setlocal
  command -nargs=* CompilerSet setlocal <args>
endif

let s:cpo_save = &cpo
set cpo-=C

CompilerSet makeprg=codespell\ %

CompilerSet errorformat=%f:%l:\ %m

let &cpo = s:cpo_save
unlet s:cpo_save
