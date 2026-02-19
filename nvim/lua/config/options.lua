-- Options are autamatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here

local opt = vim.opt

opt.background = vim.env.TERM_BACKGROUND or "light"

opt.clipboard = vim.env.KITTY_PIPE_DATA and "unnamedplus" or ""
opt.completeopt = { "menu" }
opt.formatexpr = ""
opt.grepprg = "rg --hidden -g '!.git' --vimgrep"
if vim.fn.executable("mise") == 1 then
  opt.makeprg = "mise run"
end
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

local my_clipboard = nil
if vim.env.TMUX and vim.env.SSH_TTY then
  my_clipboard = "tmux"
end
if vim.env.WSL_DISTRO_NAME then
  local wsl_copy = "clip.exe"
  local wsl_paste =
    'powershell.exe -NoLogo -NoProfile -c [Console]::Out.Write($(Get-Clipboard -Raw).tostring().replace("`r", ""))'
  my_clipboard = {
    name = "wsl",
    copy = {
      ["+"] = wsl_copy,
      ["*"] = wsl_copy,
    },
    paste = {
      ["+"] = wsl_paste,
      ["*"] = wsl_paste,
    },
  }
end
if my_clipboard then
  vim.g.clipboard = my_clipboard
  if vim.fn.exists("g:loaded_clipboard_provider") then
    vim.g.loaded_clipboard_provider = nil
    vim.cmd.runtime("autoload/provider/clipboard.vim")
  end
end

if vim.fn.has("win32") == 1 then
  opt.shellslash = true
  opt.shell = vim.fn.executable("pwsh") and "pwsh" or "powershell"
  opt.shellcmdflag =
    "-NoLogo -ExecutionPolicy RemoteSigned -Command [Console]::InputEncoding=[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new();$PSDefaultParameterValues['Out-File:Encoding']='utf8';"
  opt.shellredir = '2>&1 | %%{ "$_" } | Out-File %s; exit $LastExitCode'
  opt.shellpipe = '2>&1 | %%{ "$_" } | Tee-Object %s; exit $LastExitCode'
  opt.shellquote = ""
  opt.shellxquote = ""
end
