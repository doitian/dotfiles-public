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
        {
          filter = {
            event = "msg_show",
            kind = { "" },
            find = "^nvim%-dap is not available$",
          },
          opts = { skip = true },
        },
        {
          filter = {
            event = "msg_show",
            kind = { "" },
            find = "lines indented $",
          },
          view = "mini",
        },
      }, opts.routes or {})
    end,
  },
}
