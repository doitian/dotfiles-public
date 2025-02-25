-- Options are autamatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here

local opt = vim.opt

opt.background = vim.env.TERM_BACKGROUND or "light"

opt.clipboard = ""
opt.completeopt = { "menu" }
opt.grepprg = "rg --hidden -g '!.git' --vimgrep"
opt.laststatus = 2
opt.listchars = { tab = "▸ ", trail = "·", extends = "»", precedes = "«", nbsp = "␣" }
opt.report = 99
opt.spellfile = { vim.env.HOME .. "/.vim-spell-en.utf-8.add", ".vim-spell-en.utf-8.add" }
opt.spelllang = { "en", "cjk" }
opt.timeoutlen = 700
opt.updatetime = 1800
opt.visualbell = true
opt.wildignore = "*.swp,*.bak,*.pyc,*.class,*.beam"
opt.winwidth = 78

if vim.fn.exists("g:GuiLoaded") then
  vim.opt.guifont = "CartographCF Nerd Font:h12"
end

vim.g.netrw_winsize = -40
vim.g.netrw_banner = 0
vim.g.netrw_liststyle = 3
vim.g.markdown_folding = 1

if vim.fn.has("win32") == 1 then
  opt.shell = vim.fn.executable("pwsh") and "pwsh" or "powershell"
  opt.shellcmdflag =
    "-NoLogo -ExecutionPolicy RemoteSigned -Command [Console]::InputEncoding=[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new();$PSDefaultParameterValues['Out-File:Encoding']='utf8';"
  opt.shellredir = '2>&1 | %%{ "$_" } | Out-File %s; exit $LastExitCode'
  opt.shellpipe = '2>&1 | %%{ "$_" } | Tee-Object %s; exit $LastExitCode'
  opt.shellquote = ""
  opt.shellxquote = ""
end
