let _s = @/
%s/\(.*\), \[\([^]]\+\)\]:\?$/<br>##### ┌ **\1**, [\2]:/e
%s/^\[In reply to.*//e
let @/ = _s
unlet _s
nohl
