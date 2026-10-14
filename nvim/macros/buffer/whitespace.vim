let _s=@/
  %s/\s\+$//e
while line('$') > 1 && getline('$') ==# ''
  $d
endwhile
let @/=_s
unlet _s
nohl
