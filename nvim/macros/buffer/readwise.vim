let _s = @/
%s/^ \+/\=repeat('␣',len(submatch(0)))/ge
let @/ = _s
nohl
