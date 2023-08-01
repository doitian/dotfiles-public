-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

local map = vim.keymap.set

map("n", "<Leader>v", "`[v`]", { desc = "Select yanked/pasted" })

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

map("n", "]<Space>", "<cmd>call append(line('.'), repeat([''], v:count1))<cr>", { desc = "Insert lines below" })
map("n", "[<Space>", "<cmd>call append(line('.')-1, repeat([''], v:count1))<cr>", { desc = "Insert lines above" })
