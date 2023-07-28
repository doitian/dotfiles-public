-- bootstrap lazy.nvim, LazyVim and your plugins
vim.api.nvim_create_user_command("Viper", function(_)
  vim.opt_local.bin = true
  vim.opt_local.eol = false
  vim.opt_local.swapfile = false
  vim.opt_local.filetype = "markdown"
  vim.opt_local.buftype = "nofile"
  vim.cmd.file({ "__viper__", mods = { silent = true } })
end, {})

require("config.lazy")
