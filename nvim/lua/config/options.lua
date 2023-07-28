-- Options are autamatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here

vim.o.breakindent = true
vim.o.clipboard = ""
vim.o.listchars = "tab:▸ ,trail:·,extends:»,precedes:«,nbsp:␣"
vim.o.spellfile = vim.env.HOME .. "/.vim-spell-en.utf-8.add,.vim-spell-en.utf-8.add"
vim.o.visualbell = true
vim.o.wildignore = "*.swp,*.bak,*.pyc,*.class,*.beam"
vim.o.winwidth = 78
