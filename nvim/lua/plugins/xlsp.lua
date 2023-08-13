-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/lsp/init.lua
return {
  {
    "neovim/nvim-lspconfig",
    optional = true,
    dependencies = {
      -- Extras
      { import = "lazyvim.plugins.extras.formatting.prettier" },
      { import = "lazyvim.plugins.extras.lang.go" },
      { import = "lazyvim.plugins.extras.lang.java" },
      { import = "lazyvim.plugins.extras.lang.rust" },
    },
    opts = {
      servers = {
        tsserver = {},
        ruff_lsp = {},
      },
    },
    init = function()
      local format = function()
        local lsp_format = require("lazyvim.plugins.lsp.format")
        if vim.b.autoformat == false or not lsp_format.enabled() then
          lsp_format.format({ force = true })
          vim.cmd.update()
        else
          vim.cmd.write()
        end
      end
      local keys = require("lazyvim.plugins.lsp.keymaps").get()
      keys[#keys + 1] = { "f<CR>", format, desc = "Format and save", has = "formatting" }
    end,
  },

  {
    "nvim-treesitter/nvim-treesitter",
    optional = true,
    opts = function(_, opts)
      if type(opts.ensure_installed) == "table" then
        vim.list_extend(opts.ensure_installed, { "ninja", "python", "rst", "toml" })
      end
    end,
  },

  {
    "jose-elias-alvarez/null-ls.nvim",
    optional = true,
    opts = function(_, opts)
      local nls = require("null-ls")
      vim.list_extend(opts.sources, {
        nls.builtins.formatting.autopep8,
      })
    end,
  },

  {
    "williamboman/mason.nvim",
    optional = true,
    opts = function(_, opts)
      vim.list_extend(opts.ensure_installed, {
        "autopep8",
      })
    end,
  },

  { "udalov/kotlin-vim", ft = "kotlin" },
}
