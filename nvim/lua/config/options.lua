-- Options are autamatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here

local opt = vim.opt

opt.background = vim.env.TERM_BACKGROUND or "light"

opt.listchars = { tab = "▸ ", trail = "·", extends = "»", precedes = "«", nbsp = "␣" }
opt.spellfile = { vim.env.HOME .. "/.vim-spell-en.utf-8.add", ".vim-spell-en.utf-8.add" }
opt.timeoutlen = 700
opt.visualbell = true
opt.wildignore = "*.swp,*.bak,*.pyc,*.class,*.beam"
opt.winwidth = 78
opt.grepprg = "rg --hidden -g '!.git' --vimgrep"

vim.g.netrw_winsize = -40
vim.g.netrw_banner = 0
vim.g.netrw_liststyle = 3
