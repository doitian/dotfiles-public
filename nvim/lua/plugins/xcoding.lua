-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/coding.lua

local snippets_dir = vim.fn.expand("~/.dotfiles/repos/private/snippets")
local lazyroot_dir = vim.fn.stdpath("data") .. "/lazy"

local edit_snippet_files_opts = {
  format = function(file)
    return file:gsub(snippets_dir, "x-snippets:/"):gsub(lazyroot_dir, "$lazy:/")
  end,
  extend = function(ft, paths)
    for _, path in ipairs(paths) do
      if path:find(snippets_dir, 1, true) == 1 then
        return {}
      end
    end

    local newpath = "/snippets/" .. ft .. ".json"
    return { { "(CREATE) x-snippets:/" .. newpath, snippets_dir .. newpath } }
  end,
}

return {
  {
    "L3MON4D3/LuaSnip",
    opts = {
      store_selection_keys = "<Tab>",
    },
    keys = {
      {
        "<leader>fs",
        function()
          require("luasnip.loaders").edit_snippet_files(edit_snippet_files_opts)
        end,
        desc = "Edit Snippets",
      },
    },
    dependencies = {
      {
        "doitian/x-snippets",
        name = "x-snippets",
        dir = snippets_dir,
      },
    },
  },

  -- compatible mappings with surround
  {
    "echasnovski/mini.surround",
    keys = {
      { "ys", "gza", desc = "Add surrounding", remap = true },
      { "S", "gza", desc = "Add surrounding", mode = "v", remap = true },
      { "ds", "gzd", desc = "Delete surrounding", remap = true },
      { "cs", "gzr", desc = "Replace surrounding", remap = true },
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
