let _s=@/
  %s/\s\+$//e
while getline("$") == ""
  $d
endwhile
let @/=_s
unlet _s
nohl
