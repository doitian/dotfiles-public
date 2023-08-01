-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/lsp/init.lua
return {
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        tsserver = {},
      },
    },
    init = function()
      local format = function()
        require("lazyvim.plugins.lsp.format").format({ force = true })
      end
      local keys = require("lazyvim.plugins.lsp.keymaps").get()
      keys[#keys + 1] = { "f<cr>", format, desc = "Format Document", has = "formatting" }
    end,
  },

  {
    "jose-elias-alvarez/null-ls.nvim",
    opts = function(_, opts)
      local nls = require("null-ls")
      vim.list_extend(opts.sources, {
        nls.builtins.formatting.ruff,
      })
    end,
  },

  {
    "udalov/kotlin-vim",
    ft = "kotlin",
  },

  -- Extras
  { import = "lazyvim.plugins.extras.formatting.prettier" },
  { import = "lazyvim.plugins.extras.lang.go" },
  { import = "lazyvim.plugins.extras.lang.java" },
  { import = "lazyvim.plugins.extras.lang.python" },
  { import = "lazyvim.plugins.extras.lang.rust" },
}
