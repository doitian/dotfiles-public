let _s = @/
%s/\(.*\), \[\([^]]\+\)\]:\?$/<br>
%s/^\[In reply to.*//e
let @/ = _s
unlet _s
nohl