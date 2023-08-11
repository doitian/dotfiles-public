-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

local map = vim.keymap.set
local unmap = vim.keymap.del

map("n", "<C-G><C-G>", "<Cmd>qall<CR>", { desc = "which_key_ignore" })
map("n", "<C-G>g", "<C-G>", { desc = "which_key_ignore" })

-- editor
map("n", "<Leader>v", "`[v`]", { desc = "Select yanked/pasted" })
map({ "n", "x" }, "<Leader>d", [["_d]], { desc = "Delete without yanking" })
map({ "n", "x" }, "<Leader>p", [["0p]], { desc = "Paste from yanked" })
map({ "n", "x" }, "<Leader>P", [["0P]], { desc = "Paste from yanked above" })
map({ "n", "x" }, ">p", "<Cmd>exec 'put '.v:register<CR>", { desc = "Paste and indnet" })
map({ "n", "x" }, "<p", "<Cmd>exec 'put! '.v:register<CR>", { desc = "Paste and indnet" })
map("n", "]<Space>", "<Cmd>call append(line('.'), repeat([''], v:count1))<CR>", { desc = "Insert lines below" })
map("n", "[<Space>", "<Cmd>call append(line('.')-1, repeat([''], v:count1))<CR>", { desc = "Insert lines above" })
map("n", "gx", "<Cmd>call jobstart(['open',expand('<cfile>')])<CR>", { desc = "Open file under cursor", silent = true })
map("x", "gx", "y<Cmd>call jobstart(['open',@*])<CR>", { desc = "Open selected file", silent = true })
-- map nN does not work with folding
map("n", "n", "'Nn'[v:searchforward].'zv'", { expr = true, desc = "Next search result" })
map("n", "N", "'nN'[v:searchforward].'zv'", { expr = true, desc = "Prev search result" })
unmap({ "s" }, ">")
unmap({ "s" }, "<")

-- navigation
map(
  "n",
  "<S-H>",
  "v:count == 0 ? '<Cmd>BufferLineCyclePrev<CR>' : '<S-H>'",
  { expr = true, replace_keycodes = false, silent = true, desc = "Next Tab" }
)
map(
  "n",
  "<S-L>",
  "v:count == 0 ? '<Cmd>BufferLineCycleNext<CR>' : '<S-L>'",
  { expr = true, replace_keycodes = false, silent = true, desc = "Prev Tab" }
)
-- stylua: ignore
map("n", "]b", function() require("bufferline").cycle(vim.v.count1) end, { desc = "Next Tab" })
-- stylua: ignore
map("n", "[b", function() require("bufferline").cycle(-vim.v.count1) end, { desc = "Next Tab" })
map("n", "]a", "<Cmd>exec v:count1.'next'<CR>", { desc = "next" })
map("n", "[a", "<Cmd>exec v:count1.'previous'<CR>", { desc = "previous" })
map("n", "<Leader>bs", "<Cmd>BufferLinePick<CR>", { desc = "Pick Tab" })
