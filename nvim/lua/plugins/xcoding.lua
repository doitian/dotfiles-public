-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/coding.lua

return {
  {
    "L3MON4D3/LuaSnip",
    optional = true,
    opts = {
      store_selection_keys = "<Tab>",
    },
    keys = {
      {
        "<Leader>fS",
        function()
          require("functions.edit_snippet_files")()
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
      luasnip.filetype_extend("typescript", { "typescript", "tsdoc" })
      luasnip.filetype_extend("javascript", { "javascript", "jsdoc" })
      luasnip.filetype_extend("lua", { "lua", "luadoc" })
      luasnip.filetype_extend("python", { "python", "python-docstring" })
      luasnip.filetype_extend("rust", { "rust", "rustdoc" })
      luasnip.filetype_extend("cs", { "cs", "csharpdoc" })
      luasnip.filetype_extend("java", { "java", "javadoc" })
      luasnip.filetype_extend("sh", { "sh", "shelldoc" })
      luasnip.filetype_extend("zsh", { "zsh", "zsh", "shelldoc" })
      luasnip.filetype_extend("c", { "c", "cdoc" })
      luasnip.filetype_extend("cpp", { "cpp", "cppdoc" })
      luasnip.filetype_extend("php", { "php", "phpdoc" })
      luasnip.filetype_extend("kotlin", { "kotlin", "kdoc" })
      luasnip.filetype_extend("ruby", { "ruby", "rdoc" })
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
          mode = { "o" },
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
