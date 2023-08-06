-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazy/vim/plugins/editor.lua
local Util = require("lazyvim.util")

return {
  -- { "folke/which-key.nvim", enabled = false },
  {
    "nvim-telescope/telescope.nvim",
    optional = true,
    cmd = "Telescope",
    keys = {
      -- always use find_files instead of git_files
      { "<leader><space>", Util.telescope("find_files"), desc = "Find Files (root dir)" },
      { "<leader>ff", Util.telescope("find_files"), desc = "Find Files (root dir)" },
      { "<leader>fF", Util.telescope("find_files", { cwd = false }), desc = "Find Files (cwd)" },
      { "<leader>fh", Util.telescope("find_files", { cwd = "%:h" }), desc = "Find Files Here" },
      { "<leader>sB", "<cmd>Telescope live_grep grep_open_files=true<cr>", desc = "All Buffers" },
      { "<leader>si", "<cmd>Telescope current_buffer_ctags<cr>", desc = "BTags" },
      { "<leader>s<C-i>", "<cmd>Telescope current_buffer_tags<cr>", desc = "Tags (Buffer)" },
      { "<leader>sI", "<cmd>Telescope tags<cr>", desc = "Tags" },
    },
    opts = {
      defaults = {
        vimgrep_arguments = {
          "rg",
          "--color=never",
          "--no-heading",
          "--with-filename",
          "--line-number",
          "--column",
          "--smart-case",
          "--hidden",
          "--glob",
          "!**/.git/*",
        },
      },
      pickers = {
        find_files = {
          find_command = { "fd", "--type", "f", "--hidden", "--follow", "--exclude", ".git" },
        },
      },
    },
    config = function(_, opts)
      local telescope = require("telescope")
      telescope.setup(opts)
      telescope.load_extension("current_buffer_ctags")
    end,
  },
}
