function! s:CreateTarget() abort
  return '=' . trim(system('tmux has-session &>/dev/null && tmux split-window -h -P || tmux new-session -d -s "tmux-send" -P'))
endfunction

let s:System = function(exists('*jobstart') ? 'jobstart' : (exists('*job_start') ? 'job_start' : 'system'))

function! iy#tmux#Send(lines = @") abort
  if !exists('g:iy_tmux_target')
    let g:iy_tmux_target = s:CreateTarget()
  endif
  let comm = ['tmux', 'send-keys', '-l', '-t', trim(g:iy_tmux_target), a:lines]
  call s:System(comm)
endfunction
