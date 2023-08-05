0,/^$/ norm crs
call append(0, "---")
norm gg}
call append(line('.') - 1, "---")
%s/^\(#\+ .*\) #\+$/\1/e
nohl
