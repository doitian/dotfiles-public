augroup lazyload_au
  autocmd CmdUndefined Bm packadd iy-bm.vim
  autocmd CmdUndefined DiffOrig packadd iy-diff-orig.vim
  autocmd CmdUndefined Delete,Move packadd iy-nano-fs.vim
  if !exists(':Explore')
    autocmd CmdUndefined Lexplore,Explore sil! unlet g:loaded_netrwPlugin | runtime plugin/netrwPlugin.vim | do FileExplorer VimEnter *
  endif
augroup END
