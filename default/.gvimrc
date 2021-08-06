" Remove toolbar, left scrollbar and right scrollbar
set go-=e go-=r go-=L go-=T go-=m
set guicursor+=a:blinkwait2000-blinkon1500 " blink slowly
set mousehide " Hide the mouse when typing text

if has("mac")
  set guifont=CartographCF-Regular:h16
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
    autocmd!

    autocmd OSAppearanceChanged * call s:ChangeBackground()
  augroup END
else
  set guifont=Cartograph\ CF\ 12
endif
