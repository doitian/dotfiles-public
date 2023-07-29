-- Autocmds are automatically loaded on the VeryLazy event
-- Default autocmds that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/autocmds.lua
-- Add any additional autocmds here

local vimrc_au = vim.api.nvim_create_augroup("vimrc_au", { clear = true })
local function autocmd(event, pattern, callback)
  vim.api.nvim_create_autocmd(event, {
    group = vimrc_au,
    pattern = pattern,
    callback = callback,
  })
end

autocmd("FileType", "markdown", function()
  -- set path+=**
  vim.opt_local.suffixesadd = ".md"
  vim.opt_local.includeexpr = [[substitute(v:fname, "^\\[\\([^|]*\\).*\\]$", "\\1", "")]]
end)

autocmd("FileType", { "vim", "beancount", "i3config" }, function()
  vim.opt_local.foldmethod = "marker"
end)

autocmd({ "BufNewFile", "BufRead" }, "*/gopass-*/*", function()
  vim.opt_local.filetype = "gopass"
  vim.opt_local.swapfile = false
  vim.opt_local.backup = false
  vim.opt_local.undofile = false
end)

autocmd("SwapExists", "*", function()
  vim.v.swapchoice = "o"
end)

local ft_maps = {
  ["*.bats"] = "bats.sh",
  [".envrc"] = "envrc.sh",
  [".wiki"] = "wiki.text",
  [".anki"] = "anki.html",
  PULLREQ_EDITMSG = "gitcommit",
}
for pattern, ft in pairs(ft_maps) do
  autocmd({ "BufNewFile", "BufRead" }, pattern, function()
    vim.opt_local.filetype = ft
  end)
end
