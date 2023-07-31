return {
  {
    "folke/noice.nvim",
    optional = true,
    opts = function(_, opts)
      opts.routes = vim.list_extend({
        {
          filter = {
            event = "lsp",
            kind = "progress",
            any = {
              { find = "Validate documents" },
              { find = "Publish Diagnostics" },
            },
          },
          opts = { skip = true },
        },
      }, opts.routes or {})
    end,
  },
}
