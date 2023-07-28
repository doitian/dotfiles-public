-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/editor.lua
local Util = require("lazyvim.util")

return {
  {
    "nvim-telescope/telescope.nvim",
    cmd = "Telescope",
    keys = {
      { "<leader><space>", Util.telescope("find_files"), desc = "Find Files (root dir)" },
      { "<leader>ff", Util.telescope("find_files"), desc = "Find Files (root dir)" },
      { "<leader>fF", Util.telescope("find_files", { cwd = false }), desc = "Find Files (cwd)" },
    },
  },
}
