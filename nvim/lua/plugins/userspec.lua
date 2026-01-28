return {
  {
    "tpope/vim-dispatch",
    cmd = { "Make", "Dispatch", "Start", "FocusDispatch" },
    keys = {
      { "g<CR>", "<Cmd>Dispatch<CR>", desc = "Dispatch" },

      { "m<CR>", "<Cmd>Make<CR>", desc = "Make" },
      { "m!", ":Make!", desc = "Make!" },
      { "`<CR>", "<Cmd>Dispatch<CR>", desc = "Dispatch" },
      { "`!", ":Dispatch!", desc = "Dispatch!" },
      { "'<CR>", "<Cmd>Start<CR>", desc = "Start" },
      { "'!", ":Start!", desc = "Start!" },
      { "<Leader>g<CR>", "<Cmd>Copen<CR>", desc = "Copen" },
    },
    init = function()
      vim.g.dispatch_no_maps = 1
    end,
  },

  {
    "christoomey/vim-titlecase",
    keys = {
      { "<Leader>gz", "<Plug>Titlecase", mode = { "n", "x" }, desc = "Titlecase" },
      { "<Leader>gzz", "<Plug>TitlecaseLine", desc = "which_key_ignore" },
    },
  },

  {
    "tommcdo/vim-exchange",
    keys = {
      { "cx", mode = { "n", "x" }, desc = "Exchange" },
    },
  },

  {
    "sindrets/diffview.nvim",
    cmd = {
      "DiffviewOpen",
      "DiffviewFileHistory",
    },
  },

  { "nathangrigg/vim-beancount", ft = "beancount" },

  { "doitian/molecule-vim", ft = "mol" },
}
