return {
  {
    "doitian/diff-orig.nvim",
    dev = true,
    cmd = "DiffOrig",
    config = true,
  },

  {
    "doitian/nanofs.nvim",
    dev = true,
    cmd = { "Delete", "Remove" },
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
    "folke/which-key.nvim",
    optional = true,
    opts = {
      operators = { ["<Leader>gz"] = "Titlecase" },
    },
  },
}
