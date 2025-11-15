let _s = @/
%s/^ \+/\=repeat('␣',len(submatch(0)))/ge
%s/^$/↩︎/e
let @/ = _s
nohl
