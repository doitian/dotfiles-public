let _s = @/
%s/\(.*\) — \(.* at .* [AP]M\)$/<br>
%s/\(.*\) — \(.*\/\d\d\d\d\)$/<br>
%s/^\[\d\?\d:\d\d [AP]M\]$/
let @/ = _s
unlet _s
nohl