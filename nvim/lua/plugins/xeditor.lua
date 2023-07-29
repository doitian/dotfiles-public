-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/editor.lua
local Util = require("lazyvim.util")

return {
  {
    "nvim-telescope/telescope.nvim",
    cmd = "Telescope",
    keys = {
      -- always use find_files instead of git_files
      { "<leader><space>", Util.telescope("find_files"), desc = "Find Files (root dir)" },
      { "<leader>ff", Util.telescope("find_files"), desc = "Find Files (root dir)" },
      { "<leader>fF", Util.telescope("find_files", { cwd = false }), desc = "Find Files (cwd)" },
      { "<leader>fh", Util.telescope("find_files", { cwd = "%:h" }), desc = "Find Files Here" },
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
  },
}
