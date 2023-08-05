function! iy#bm#line(message)
  let l:line = expand('%') . '|' . line('.') . ' col ' . col('.') . '| ' .
        \ (a:message ==# '' ? getline('.') : a:message)
  call writefile([l:line], 'bookmarks.qf', 'a')
endfunction
