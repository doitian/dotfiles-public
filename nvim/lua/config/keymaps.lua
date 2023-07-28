-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

local Util = require("lazyvim.util")
local map = vim.keymap.set

map("n", "<Leader>p", '"+p', { desc = "Paste from system clipboard" })
map("n", "<Leader>P", '"+P', { desc = "which_key_ignore" })
map({ "n", "x" }, "<Leader>y", '"+y', { desc = "Yank to system clipboard" })
map({ "n", "x" }, "<Leader>Y", '"+Y', { desc = "which_key_ignore" })

map(
  "n",
  "<S-h>",
  "v:count == 0 ? '<cmd>BufferLineCyclePrev<cr>' : '<S-h>'",
  { expr = true, replace_keycodes = false, silent = true, desc = "Next Tab" }
)
map(
  "n",
  "<S-l>",
  "v:count == 0 ? '<cmd>BufferLineCycleNext<cr>' : '<S-l>'",
  { expr = true, replace_keycodes = false, silent = true, desc = "Prev Tab" }
)

map("n", "<leader>fh", Util.telescope("find_files", { cwd = "%:h" }), { desc = "Find Files Here" })
map(
  "n",
  "<leader>fs",
  Util.telescope("find_files", { cwd = vim.fn.expand("~/.config/nvim/snippets/") }),
  { desc = "Find Snippets" }
)

map("n", "]<Space>", "<cmd>call append(line('.'), repeat([''], v:count1))<cr>", { desc = "Insert lines below" })
map("n", "[<Space>", "<cmd>call append(line('.')-1, repeat([''], v:count1))<cr>", { desc = "Insert lines above" })

--- User Commands
vim.api.nvim_create_user_command("Delete", function()
  vim.fn.delete(vim.fn.expand("%"))
  vim.cmd.bdelete()
  ---@diagnostic disable-next-line: param-type-mismatch
  vim.fn.setreg("#", vim.fn.bufnr("%"))
end, {})

vim.api.nvim_create_user_command("Move", function(opts)
  vim.cmd.saveas(opts.fargs[1])
  vim.fn.delete(vim.fn.expand("#"))
  vim.cmd.bdelete("#")
  ---@diagnostic disable-next-line: param-type-mismatch
  vim.fn.setreg("#", vim.fn.bufnr("%"))
end, { nargs = 1, complete = "file" })

vim.api.nvim_create_user_command("DiffOrig", function(_)
  vim.cmd.new({ mods = { vertical = true } })
  vim.opt_local.buftype = "nofile"
  vim.cmd.r("#")
  vim.cmd("0d_")
  vim.cmd.diffthis()
  vim.cmd.wincmd("p")
  vim.cmd.diffthis()
end, {})
