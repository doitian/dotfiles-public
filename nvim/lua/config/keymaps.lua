-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

vim.keymap.set("n", "<Leader>p", '"+p', { desc = "Paste from system clipboard" })
vim.keymap.set("n", "<Leader>P", '"+P', { desc = "which_key_ignore" })
vim.keymap.set({ "n", "x" }, "<Leader>y", '"+y', { desc = "Yank to system clipboard" })
vim.keymap.set({ "n", "x" }, "<Leader>Y", '"+Y', { desc = "which_key_ignore" })

vim.api.nvim_create_user_command("Delete", function()
  vim.fn.delete(vim.fn.expand("%"))
  require("mini.bufremove").delete()
end, {})

vim.api.nvim_create_user_command("Move", function(opts)
  vim.cmd.saveas(opts.fargs[1])
  vim.fn.delete(vim.fn.expand("#"))
  ---@diagnostic disable-next-line: param-type-mismatch
  require("mini.bufremove").delete(vim.fn.bufnr("#"))
end, { nargs = 1, complete = "file" })
