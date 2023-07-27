-- Autocmds are automatically loaded on the VeryLazy event
-- Default autocmds that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/autocmds.lua
-- Add any additional autocmds here

local vimrc_au = vim.api.nvim_create_augroup("vimrc_au", { clear = true })

vim.api.nvim_create_autocmd({ "FileType" }, {
  group = vimrc_au,
  pattern = "markdown",
  callback = function()
    vim.opt_local.formatoptions:append("ro")
    vim.opt_local.suffixesadd = ".md"
  end,
})

vim.api.nvim_create_autocmd({ "FileType" }, {
  group = vimrc_au,
  pattern = "rust",
  callback = function()
    vim.opt_local.winwidth = 99
  end,
})

vim.api.nvim_create_autocmd({ "FileType" }, {
  group = vimrc_au,
  pattern = { "vim", "beancount", "i3config" },
  callback = function()
    vim.opt_local.foldmethod = "marker"
  end,
})

vim.api.nvim_create_autocmd("SwapExists", {
  group = vimrc_au,
  pattern = "*",
  callback = function()
    vim.v.swapchoice = "o"
  end,
})

local ft_maps = {
  ["*.bats"] = "bats.sh",
  [".envrc"] = "envrc.sh",
  [".wiki"] = "wiki.text",
  [".anki"] = "anki.html",
  PULLREQ_EDITMSG = "gitcommit",
}
for pattern, ft in pairs(ft_maps) do
  vim.api.nvim_create_autocmd({ "BufNewFile", "BufRead" }, {
    group = vimrc_au,
    pattern = pattern,
    callback = function()
      vim.opt_local.filetype = ft
    end,
  })
end
