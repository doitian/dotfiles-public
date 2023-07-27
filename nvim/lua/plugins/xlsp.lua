return {
  -- Global
  {
    "neovim/nvim-lspconfig",
    init = function()
      local format = function()
        require("lazyvim.plugins.lsp.format").format({ force = true })
      end
      local keymaps = require("lazyvim.plugins.lsp.keymaps").get()
      keymaps[#keymaps + 1] = { "f<cr>", format, desc = "Format Document", has = "formatting" }
    end,
  },

  -- Golang
  {
    "neovim/nvim-lspconfig",
    ft = "go",
    opts = {
      servers = {
        gopls = {},
      },
    },
  },
  {
    "jose-elias-alvarez/null-ls.nvim",
    ft = "go",
    opts = function(_, opts)
      local nls = require("null-ls")
      vim.list_extend(opts.sources, {
        nls.builtins.formatting.gofmt,
        nls.builtins.formatting.goimports,
      })
    end,
  },
}
