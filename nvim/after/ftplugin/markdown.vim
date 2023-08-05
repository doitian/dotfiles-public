setlocal suffixesadd=.md
setlocal includeexpr=substitute(v:fname, "^\\[\\([^|]*\\).*\\]$", "\\1", "")
