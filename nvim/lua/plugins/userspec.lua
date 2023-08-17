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
    "jvgrootveld/telescope-zoxide",
    dependencies = {
      { "nvim-telescope/telescope.nvim" },
    },
    cond = function()
      return vim.fn.executable("zoxide") == 1
    end,
    keys = {
      { "<Leader>fj", "<Cmd>Telescope zoxide list<CR>", desc = "Zoxide" },
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
      { "<Leader>fs", "<Cmd>Telescope luasnip<CR>", desc = "Insert snippet" },
    },
    config = function()
      require("telescope").load_extension("luasnip")
    end,
  },

  {
    "folke/zen-mode.nvim",
    cmd = { "ZenMode" },
    opts = { window = { backdrop = 1, options = { signcolumn = "no", number = false, relativenumber = false } } },
    keys = { { "<C-W>z", "<Cmd>ZenMode<CR>", desc = "ZenMode" } },
  },

  {
    "nathangrigg/vim-beancount",
    ft = "beancount",
  },
}
