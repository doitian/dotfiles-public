let _s=@/
%s/\s\+$//e
sil! $/^$/d
let @/=_s
unlet _s
nohl
