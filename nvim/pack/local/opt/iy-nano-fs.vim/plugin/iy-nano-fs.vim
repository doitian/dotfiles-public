if !exists(':Delete')
  command Delete call delete(expand('%')) | bdelete | let @# = bufnr('%')
endif

if !exists(':Move')
  command -nargs=1 -complete=file Move saveas <args> | call delete(expand('#')) |
        \ exec 'bdelete #' | let @# = bufnr('%')
endif
