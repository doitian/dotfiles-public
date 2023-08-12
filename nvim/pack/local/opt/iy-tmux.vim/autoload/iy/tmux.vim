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
