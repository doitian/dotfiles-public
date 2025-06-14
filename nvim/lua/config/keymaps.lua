-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
-- vim: foldmethod=marker

local map = vim.keymap.set
local unmap = vim.keymap.del

-- editor {{{1
map("n", "<Leader>v", "`[v`]", { desc = "Select yanked/pasted" })
map({ "n", "x" }, "<Leader>d", [["_d]], { desc = "Delete without yanking" })
map({ "n", "x" }, "<Leader>D", [["_D]], { desc = "Delete without yanking" })
map({ "n", "x" }, "<Leader>p", [["0p]], { desc = "Paste from yanked" })
map({ "n", "x" }, "<Leader>P", [["0P]], { desc = "Paste from yanked above" })
if vim.env.TMUX and vim.env.SSH_TTY then
  vim.cmd([[packadd iy-tmux.vim]])
  map({ "n", "x" }, "<Leader>y", [[<Plug>(TmuxYank)]], { desc = "Yank into system clipboard", remap = true })
  map("n", "<Leader>yy", [[<Plug>(TmuxYankLine)]], { desc = "Yank into system clipboard", remap = true })
  map({ "n", "x" }, "<Leader>Y", [[<Plug>(TmuxYankLine)]], { desc = "Yank into system clipboard", remap = true })
else
  map({ "n", "x" }, "<Leader>y", [["+y]], { desc = "Yank into system clipboard" })
  map({ "n", "x" }, "<Leader>Y", [["+Y]], { desc = "Yank into system clipboard" })
end
map("n", ">p", "<Cmd>exec 'put '.v:register.\"<Bar>keepjump norm '[\"<CR>", { desc = "Paste below" })
map("n", "<p", "<Cmd>exec 'put! '.v:register.\"<Bar>keepjump norm '[\"<CR>", { desc = "Paste above" })
map("n", ">gp", "<Cmd>exec 'put '.v:register<CR>j", { desc = "Paste below" })
map("n", "<gp", "<Cmd>exec 'put! '.v:register<CR>j", { desc = "Paste above" })
map("n", "gx", "<Cmd>call jobstart(['open',expand('<cfile>')])<CR>", { desc = "Open file under cursor", silent = true })
map("x", "gx", "y<Cmd>call jobstart(['open',@*])<CR>", { desc = "Open selected file", silent = true })
map("x", "&", ":&&<CR>", { desc = "Repeat substitution on selected lines" })
vim.F.npcall(unmap, { "s" }, ">")
vim.F.npcall(unmap, { "s" }, "<")

if vim.fn.exists("g:GuiLoaded") and vim.fn.has("win32") == 1 then
  map({ "n", "x" }, "<C-S-V>", [["+p]], { desc = "Paste from system clipboard" })
  map("i", "<C-S-V>", "<C-R>+", { desc = "Paste from system clipboard" })
end

-- windows {{{1
map("n", "<Leader>wk", "<Cmd>Close<CR>", { desc = "Close disturbing windows" })

-- navigation {{{1
map(
  "n",
  "<S-H>",
  "v:count == 0 ? '<Cmd>BufferLineCyclePrev<CR>' : '<S-H>'",
  { expr = true, replace_keycodes = false, silent = true, desc = "Next tab" }
)
map(
  "n",
  "<S-L>",
  "v:count == 0 ? '<Cmd>BufferLineCycleNext<CR>' : '<S-L>'",
  { expr = true, replace_keycodes = false, silent = true, desc = "Prev tab" }
)

map("n", "<leader>ws", "<C-W>s", { desc = "Split window below", remap = true })
map("n", "<leader>wv", "<C-W>v", { desc = "Split window right", remap = true })

map("n", "<Leader>fj", "<Cmd>drop `jrnl -p`<CR>", { desc = "Edit journal" })

-- coding {{{1
map("n", "<Leader>cw", "<Cmd>ru macros/buffer/whitespace.vim<CR>", { desc = "Fix whitespace issues" })
