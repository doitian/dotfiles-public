-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/coding.lua
return {
  {
    "L3MON4D3/LuaSnip",
    opts = {
      store_selection_keys = "<Tab>",
    },
  },

  -- compatible mappings with surround
  {
    "echasnovski/mini.surround",
    opts = {
      mappings = {
        add = "ys", -- Add surrounding in Normal and Visual modes
        delete = "ds", -- Delete surrounding
        replace = "cs", -- Replace surrounding

        find = "gzf", -- Find surrounding (to the right)
        find_left = "gzF", -- Find surrounding (to the left)
        highlight = "gzh", -- Highlight surrounding
        update_n_lines = "gzn", -- Update `n_lines`
      },
    },
  },
  {
    "folke/flash.nvim",
    keys = {
      -- use z becasue s is used by surround
      {
        "z",
        function()
          require("flash").jump()
        end,
        mode = "o",
        desc = "Flash",
      },
    },
  },
}
