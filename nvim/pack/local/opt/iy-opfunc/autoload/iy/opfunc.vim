function! iy#opfunc#wrap(func) abort
  set opfunc=iy#opfunc#do
  let g:IyOpfuncDo = type(a:func) ==# v:t_func ? a:func : function(a:func)
  return 'g@'
endfunction

function! iy#opfunc#do(type = '') abort
  let sel_save = &selection
  let reg_save = getreginfo('"')
  let cb_save = &clipboard
  let visual_marks_save = [getpos("'<"), getpos("'>")]

  try
    set clipboard= selection=inclusive
    let commands = #{line: "'[V']y", char: "`[v`]y", block: "`[\<c-v>`]y"}
    silent exe 'noautocmd keepjumps normal! ' .. get(commands, a:type, 'gvy')

    call g:IyOpfuncDo()
  finally
    call setreg('"', reg_save)
    call setpos("'<", visual_marks_save[0])
    call setpos("'>", visual_marks_save[1])
    let &clipboard = cb_save
    let &selection = sel_save
  endtry
endfunction
