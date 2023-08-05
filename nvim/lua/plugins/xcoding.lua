-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/coding.lua

local snippets_dir = vim.fn.stdpath("config") .. "/local/iy-snippets.vim/snippets/"
local edit_snippet_files_opts = {
  format = function(file)
    return file:gsub(".*/(.+)/snippets/", "%1 -> ")
  end,
  extend = function(ft)
    local filename = ft .. ".json"
    local path = snippets_dir .. filename
    if vim.fn.filereadable(path) == 0 then
      return { { "(CREATE) " .. filename, path } }
    end
    return {}
  end,
}

return {
  {
    "L3MON4D3/LuaSnip",
    optional = true,
    opts = {
      store_selection_keys = "<Tab>",
    },
    keys = {
      {
        "<leader>fS",
        function()
          require("luasnip.loaders").edit_snippet_files(edit_snippet_files_opts)
        end,
        desc = "Edit Snippets",
      },
    },
  },
  {
    "rafamadriz/friendly-snippets",
    optional = true,
    config = function()
      local luasnip = require("luasnip")
      luasnip.filetype_extend("typescript", { "tsdoc" })
      luasnip.filetype_extend("javascript", { "jsdoc" })
      luasnip.filetype_extend("lua", { "luadoc" })
      luasnip.filetype_extend("python", { "python-docstring" })
      luasnip.filetype_extend("rust", { "rustdoc" })
      luasnip.filetype_extend("cs", { "csharpdoc" })
      luasnip.filetype_extend("java", { "javadoc" })
      luasnip.filetype_extend("sh", { "shelldoc" })
      luasnip.filetype_extend("zsh", { "shelldoc" })
      luasnip.filetype_extend("c", { "cdoc" })
      luasnip.filetype_extend("cpp", { "cppdoc" })
      luasnip.filetype_extend("php", { "phpdoc" })
      luasnip.filetype_extend("kotlin", { "kdoc" })
      luasnip.filetype_extend("ruby", { "rdoc" })
      require("luasnip.loaders.from_vscode").lazy_load()
    end,
  },

  -- compatible mappings with surround
  {
    "folke/flash.nvim",
    optional = true,
    keys = function(_, keys)
      for _, k in ipairs(keys) do
        if k[1] == "S" then
          k.mode = { "n", "o" }
        end
      end

      return vim.list_extend(keys, {
        -- use z becasue s is used by surround
        {
          "z",
          function()
            require("flash").jump()
          end,
          mode = { "x", "o" },
          desc = "Flash",
        },
        { "ys", "gza", desc = "Add surrounding", remap = true },
        { "S", "gza", desc = "Add surrounding", mode = "x", remap = true },
        { "ds", "gzd", desc = "Delete surrounding", remap = true },
        { "cs", "gzr", desc = "Replace surrounding", remap = true },
      })
    end,
  },
}
