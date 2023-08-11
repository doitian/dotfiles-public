function! s:Preview(bufname, filetype, lines)
  exec 'silent! pedit! +setlocal\ ' .
        \ 'filetype=' .. a:filetype .. '\ ' .
        \ 'buftype=nofile\ bh=wipe\ noswapfile ' .
        \ fnameescape(a:bufname)

  let nr = winnr()
  silent! wincmd P
  if &previewwindow
    %delete | call setline(1, a:lines)
    exec nr .. "wincmd w"
  endif
endfunction

function! iy#opfunc#system#Preview(lines = @")
  let list = split(a:lines, "\n")
  let bufname = '$ ' .. list[-1]
  let preview = list + ['', 'cat << "OUTPUT"'] + systemlist(a:lines) + ['OUTPUT']
  call s:Preview(bufname, 'sh', preview)
endfunction

function! iy#opfunc#system#PipePreview(lines = @")
  let shellcmd = input('> ', '', 'shellcmd')
  if shellcmd !=# ''
    call iy#opfunc#system#Preview('echo -n ' .. shellescape(a:lines) .. " |\n" .. shellcmd)
  endif
endfunction

function! iy#opfunc#system#Replace(lines = @")
  let reg_save = getreginfo('"')
  let @" = join(systemlist(a:lines), "\n")
  silent exe "noautocmd keepjumps normal! gv\"_c\<C-R>\"\<Esc>"
  call setreg('"', reg_save)
endfunction

function! iy#opfunc#system#PipeReplace(lines = @")
  let l:shellcmd = input('< ', '', 'shellcmd')
  if l:shellcmd !=# ''
    let reg_save = getreginfo('"')
    let @" = join(systemlist(l:shellcmd, a:lines), "\n")
    silent exe "noautocmd keepjumps normal! gv\"_c\<C-R>\"\<Esc>"
    call setreg('"', reg_save)
  endif
endfunction
