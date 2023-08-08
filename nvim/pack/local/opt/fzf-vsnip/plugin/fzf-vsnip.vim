if exists('g:loaded_fzf_vsnip')
  finish
endif
let g:loaded_fzf_vsnip = 1

if !exists(':Snippets')
  command -bang Snippets call fzf#vsnip#complete(<bang>0)
endif
