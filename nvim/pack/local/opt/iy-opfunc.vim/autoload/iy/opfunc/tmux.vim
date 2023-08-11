function! iy#opfunc#tmux#Send(lines = @") abort
  if !exists("g:iy_opfunc_tmux_target")
    let g:iy_opfunc_tmux_target = trim(system('tt -h -p'))
  endif
  let tt_send = 'tt -t ' . shellescape(trim(g:iy_opfunc_tmux_target)) . ' '
  for line in split(a:lines, "\n")
    call system(tt_send . shellescape(line))
  endfor
endfunction
