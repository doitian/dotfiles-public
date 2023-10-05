let _s=@/
%s/\s\+$//e
sil! $g/^$/d
let @/=_s
unlet _s
nohl
