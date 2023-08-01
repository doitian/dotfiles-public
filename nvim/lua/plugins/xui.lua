-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/ui.lua
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

  {
    "nvim-lualine/lualine.nvim",
    optional = true,
    opts = function(_, opts)
      opts.sections.lualine_z = nil
      table.insert(opts.sections.lualine_x, 2, {
        function()
          return "🛡️"
        end,
        cond = function()
          return vim.env.HTTP_PROXY ~= nil
        end,
      })
    end,
  },
}
