-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

local Util = require("lazyvim.util")

vim.keymap.set("n", "<Leader>p", '"+p', { desc = "Paste from system clipboard" })
vim.keymap.set("n", "<Leader>P", '"+P', { desc = "which_key_ignore" })
vim.keymap.set({ "n", "x" }, "<Leader>y", '"+y', { desc = "Yank to system clipboard" })
vim.keymap.set({ "n", "x" }, "<Leader>Y", '"+Y', { desc = "which_key_ignore" })

vim.keymap.set("n", "<leader>fh", Util.telescope("files", { cwd = "%:h" }), { desc = "Find Files Here" })
vim.keymap.set(
  "n",
  "<leader>fs",
  Util.telescope("files", { cwd = vim.fn.expand("~/.config/nvim/snippets/") }),
  { desc = "Find Snippets" }
)

local function blank_lines(count)
  local lines = {}
  for i = 1, count do
    lines[i] = ""
  end
  return lines
end

vim.keymap.set("n", "]<Space>", function()
  ---@diagnostic disable-next-line: param-type-mismatch
  vim.fn.append(vim.fn.line("."), blank_lines(vim.v.count1))
end, { desc = "Insert lines below" })
vim.keymap.set("n", "[<Space>", function()
  ---@diagnostic disable-next-line: param-type-mismatch
  vim.fn.append(vim.fn.line(".") - 1, blank_lines(vim.v.count1))
end, { desc = "Insert lines below" })

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
