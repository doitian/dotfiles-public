-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

vim.keymap.set("n", "<Leader>p", '"+p', { desc = "Paste from system clipboard" })
vim.keymap.set("n", "<Leader>P", '"+P', { desc = "which_key_ignore" })
vim.keymap.set({ "n", "x" }, "<Leader>y", '"+y', { desc = "Yank to system clipboard" })
vim.keymap.set({ "n", "x" }, "<Leader>Y", '"+Y', { desc = "which_key_ignore" })
vim.keymap.set({ "n", "x" }, "<Leader>d", '"_d', { desc = "Delete into black hole", silent = true })
vim.keymap.set({ "n", "x" }, "<Leader>D", '"_D', { desc = "which_key_ignore", silent = true })

local format = function()
  require("lazyvim.plugins.lsp.format").format({ force = true })
end
vim.keymap.set("n", "f<cr>", format, { desc = "Format Document" })
