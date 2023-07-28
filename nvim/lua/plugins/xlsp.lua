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
}
