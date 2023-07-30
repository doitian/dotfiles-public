return {
  {
    "doitian/x-diff-orig.nvim",
    dev = true,
    cmd = "DiffOrig",
    config = true,
  },

  {
    "doitian/x-nanofs.nvim",
    dev = true,
    cmd = { "Delete", "Remove" },
    config = true,
  },

  {
    "doitian/x-bm.nvim",
    dev = true,
    cmd = { "Bm" },
    config = true,
  },

  {
    "christoomey/vim-titlecase",
    keys = {
      { "<Leader>gz", "<Plug>Titlecase", mode = { "n", "x" }, desc = "Titlecase" },
      { "<Leader>gzz", "<Plug>TitlecaseLine", desc = "which_key_ignore" },
    },
  },

  {
    "tpope/vim-dispatch",
    cmd = { "FocusDispatch", "Dispatch", "Start", "Spawn" },
    keys = {
      { "g<cr>", "<cmd>Dispatch<cr>", desc = "Dispatch" },
    },
    init = function()
      vim.g.dispatch_no_maps = 1
    end,
  },
}
