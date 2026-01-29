let s:System = function(exists('*jobstart') ? 'jobstart' : (exists('*job_start') ? 'job_start' : 'system'))

function! s:CreateTarget() abort
  return '=' . trim(system('tmux has-session &>/dev/null && tmux split-window -h -P || tmux new-session -d -s "tmux-send" -P'))
endfunction

function! s:GetTarget() abort
  if exists('b:iy_tmux_target')
    return trim(b:iy_tmux_target)
  endif
  if !exists('g:iy_tmux_target')
    let g:iy_tmux_target = s:CreateTarget()
  endif
  return trim(g:iy_tmux_target)
endfunction

function! iy#tmux#SendKeys(...) abort
  if !exists('g:iy_tmux_target')
    let g:iy_tmux_target = s:CreateTarget()
  endif
  let comm = flatten([['tmux', 'send-keys', '-t', s:GetTarget()], a:000], 1)
  call s:System(comm)
endfunction

function! iy#tmux#SendLine(...) abort
  let chunk1 = ['tmux', 'send-keys', '-t', s:GetTarget(), '-l']
  let chunk2 = ['\;', 'send-keys', '-t', s:GetTarget(), 'C-m']
  let comm = flatten([chunk1, a:000, chunk2], 1)
  call s:System(comm)
endfunction

function! iy#tmux#SetBuffer(data) abort
  call s:System(['tmux', 'set-buffer', '--', a:data])
endfunction

function! iy#tmux#Go() abort
  call s:System(['tmux', 'switchc', '-t', s:GetTarget()])
endfunction

function! iy#tmux#SendKeysAndGo(...) abort
  call call('iy#tmux#SendKeys', a:000)
  call iy#tmux#Go()
endfunction

function! iy#tmux#Yank(type = '') abort
  if a:type == ''
    let &operatorfunc = function('iy#tmux#Yank')
    return 'g@'
  endif

  let save = #{
    \ register: getreginfo('"'),
    \ }
  let commands = #{
        \ line: "'[V']y",
        \ char: "`[v`]y",
        \ block: "`[\<C-V>`]y",
        \ }[a:type]
  try
    execute 'silent noautocmd keepjumps normal! ' . commands
    call s:System(['tmux', 'set-buffer', getreg('"')])
  finally
    call setreg('"', save.register)
  endtry
endfunction
