-- no 24-bit colors
local lazy = vim.env.LAZY or vim.tbl_contains({ "truecolor", "24bit" }, vim.env.COLORTERM)
if not lazy or lazy == "0" then
  vim.opt.rtp:prepend("~/.vim")
  vim.opt.packpath = vim.opt.rtp:get()
  vim.cmd.source("~/.vimrc")
  return
end

-- vim +Viper
vim.api.nvim_create_user_command("Viper", function(_)
  vim.opt_local.bin = true
  vim.opt_local.eol = false
  vim.opt_local.swapfile = false
  vim.opt_local.filetype = "markdown"
  vim.opt_local.buftype = "nofile"
  vim.cmd.file({ "__viper__", mods = { silent = true } })
end, {})

-- bootstrap lazy.nvim, LazyVim and your plugins
require("config.lazy")

if vim.env.DIRENV_EXTRA_VIMRC then
  vim.cmd.source(vim.env.DIRENV_EXTRA_VIMRC)
end
