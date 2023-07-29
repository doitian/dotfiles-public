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
      {
        "<leader>fs",
        Util.telescope("find_files", { cwd = vim.fn.expand("~/.config/nvim/snippets/") }),
        desc = "Find Snippets",
      },
    },
  },
}
