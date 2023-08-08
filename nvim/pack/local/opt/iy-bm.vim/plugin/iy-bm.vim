if exists('g:loaded_iy_bm')
  finish
endif
let g:loaded_iy_bm = 1

if !exists(':Bm')
  command -nargs=* Bm call iy#bm#line(<q-args>)
endif
