set guifont=JetBrainsMono-Regular:h16
set macligatures

func! s:ChangeBackground()
  if (v:os_appearance)
    set background=dark
  else 
    set background=light
  endif
  redraw!
endfunc

augroup gvimrc_au
  autocmd OSAppearanceChanged * call s:ChangeBackground()
augroup END
