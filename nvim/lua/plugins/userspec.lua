return {
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
