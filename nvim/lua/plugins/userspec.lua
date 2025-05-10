return {
  {
    "christoomey/vim-titlecase",
    keys = {
      { "<Leader>gz", "<Plug>Titlecase", mode = { "n", "x" }, desc = "Titlecase" },
      { "<Leader>gzz", "<Plug>TitlecaseLine", desc = "which_key_ignore" },
    },
  },

  {
    "tpope/vim-dispatch",
    cmd = { "Make", "Dispatch", "Start", "FocusDispatch" },
    keys = {
      { "m<CR>", "<Cmd>Make<CR>", desc = "Make" },
      { "m!", "<Cmd>Make!<CR>", desc = "Make!" },
      { "`<CR>", "<Cmd>Dispatch<CR>", desc = "Dispatch" },
      { "`!", "<Cmd>Dispatch!<CR>", desc = "Dispatch!" },
      { "'<CR>", "<Cmd>Start<CR>", desc = "Start" },
      { "'!", "<Cmd>Start!<CR>", desc = "Start!" },

      { "g<CR>", "<Cmd>Dispatch!<CR>", desc = "Dispatch!" },
    },
    init = function()
      vim.g.dispatch_no_maps = 1
    end,
  },

  {
    "nathangrigg/vim-beancount",
    ft = "beancount",
  },

  {
    "tommcdo/vim-exchange",
    keys = {
      { "cx", mode = { "n", "x" }, desc = "Exchange" },
    },
  },

  {
    "doitian/molecule-vim",
    ft = "mol",
  },
}
