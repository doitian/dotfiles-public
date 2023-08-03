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
    cmd = { "Make", "Dispatch", "Start", "FocusDispatch" },
    keys = {
      { "m<cr>", "<cmd>Make<cr>", desc = "Make" },
      { "m!", "<cmd>Make!<cr>", desc = "Make!" },
      { "`<cr>", "<cmd>Dispatch<cr>", desc = "Dispatch" },
      { "`!", "<cmd>Dispatch!<cr>", desc = "Dispatch!" },
      { "'<cr>", "<cmd>Start<cr>", desc = "Start" },
      { "'!", "<cmd>Start!<cr>", desc = "Start!" },

      { "g<cr>", "<cmd>Dispatch!<cr>", desc = "Dispatch!" },
    },
    init = function()
      vim.g.dispatch_no_maps = 1
    end,
  },

  {
    "jvgrootveld/telescope-zoxide",
    dependencies = {
      { "nvim-telescope/telescope.nvim" },
    },
    cond = function()
      return vim.fn.executable("zoxide") == 1
    end,
    keys = {
      { "<leader>fj", "<cmd>Telescope zoxide list<cr>", desc = "Zoxide" },
    },
    config = function()
      require("telescope").load_extension("zoxide")
    end,
  },

  {
    "benfowler/telescope-luasnip.nvim",
    dependencies = {
      { "nvim-telescope/telescope.nvim" },
      { "L3MON4D3/LuaSnip" },
    },
    keys = {
      { "<leader>fs", "<cmd>Telescope luasnip<cr>", desc = "Insert snippet" },
    },
    config = function()
      require("telescope").load_extension("luasnip")
    end,
  },
}
