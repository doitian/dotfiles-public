return {
  {
    "tpope/vim-dispatch",
    cmd = { "Make", "Dispatch", "Start", "FocusDispatch" },
    keys = {
      { "g<CR>", "<Cmd>Dispatch<CR>", desc = "Dispatch" },
      { "<Leader>g<CR>", "<Cmd>Copen<CR>", desc = "Copen" },

      { "m<CR>", "<Cmd>Make<CR>", desc = "Make" },
      { "m!", ":Make!", desc = ":Make!" },
      { "m<Space>", ":Make<Space>", desc = ":Make" },
      { "`<CR>", "<Cmd>Dispatch!<CR>", desc = "Dispatch!" },
      { "`!", ":Dispatch!", desc = ":Dispatch!" },
      { "`<Space>", ":Dispatch<Space>", desc = ":Dispatch" },
      { "'<CR>", "<Cmd>Start<CR>", desc = "Start" },
      { "'!", ":Start!", desc = ":Start!" },
      { "'<Space>", ":Start<Space>", desc = ":Start" },
    },
    init = function()
      vim.g.dispatch_no_maps = 1
      vim.g.dispatch_compilers = { ["mise exec --"] = "" }
    end,
  },

  {
    "christoomey/vim-titlecase",
    keys = {
      { "<Leader>gz", "<Plug>Titlecase", mode = { "n", "x" }, desc = "Titlecase" },
      { "<Leader>gzz", "<Plug>TitlecaseLine" },
    },
  },

  {
    "tommcdo/vim-exchange",
    keys = {
      { "cx", mode = { "n", "x" }, desc = "Exchange" },
    },
  },

  {
    "esmuellert/codediff.nvim",
    cmd = "CodeDiff",
  },

  {
    "georgeguimaraes/review.nvim",
    version = "*",
    dependencies = {
      "esmuellert/codediff.nvim",
      "MunifTanjim/nui.nvim",
    },
    event = "VeryLazy",
    keys = {
      { "<leader>rr", "<cmd>Review<cr>", desc = "Review working tree" },
      { "<leader>rc", "<cmd>Review commits<cr>", desc = "Review commits" },
      { "<leader>rb", "<cmd>Review branch<cr>", desc = "Review branch" },
      { "<leader>rn", ":Review note<cr>", mode = { "n", "v" }, desc = "Review: note here" },
      { "<leader>re", "<cmd>Review edit<cr>", desc = "Review: edit comment" },
      { "<leader>rd", "<cmd>Review delete<cr>", desc = "Review: delete comment" },
      { "<leader>rx", "<cmd>Review export<cr>", desc = "Review: export" },
    },
    opts = {},
  },

  { "doitian/molecule-vim", ft = "mol" },
}
