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

-- run the command and keep the window open
autocmd("CmdwinEnter", "*", function()
  vim.keymap.set("n", "<C-W><C-W>", "<CR>q:dd", { buffer = true })
end)

-- edit qf: set ma | ... | cgetb
autocmd("FileType", { "qf" }, function()
  vim.opt_local.errorformat = "%f|%l col %c|%m"

  if vim.o.buftype ~= "quickfix" then
    vim.keymap.del("n", "q", { buffer = true })
  end
end)

autocmd({ "BufNewFile", "BufRead" }, "*/gopass-*/*", function()
  vim.opt_local.filetype = "gopass.yaml"
  vim.opt_local.swapfile = false
  vim.opt_local.backup = false
  vim.opt_local.undofile = false
end)

autocmd("SwapExists", "*", function()
  ---@diagnostic disable-next-line: undefined-field
  vim.v.swapchoice = vim.F.if_nil(vim.b.swapchoice, "o")
  if vim.v.swapchoice ~= "" then
    require("notify")("auto select: " .. vim.v.swapchoice, "warn", { title = "SwapExists" })
  end
end)

local ft_maps = {
  PULLREQ_EDITMSG = "gitcommit",
  ["*.qf"] = "qf",
  [".envrc"] = "envrc.sh",
  ["*.bats"] = "bats.sh",
  ["*.wiki"] = "wiki.text",
  ["*.anki"] = "anki.html",
}
for pattern, ft in pairs(ft_maps) do
  autocmd({ "BufNewFile", "BufRead" }, pattern, function()
    vim.opt_local.filetype = ft
  end)
end
