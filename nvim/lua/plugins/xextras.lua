return {
  -- import any extras modules here
  -- :let @/ = "[- ]*"
  { import = "lazyvim.plugins.extras.coding.copilot" },
  -- { import = "lazyvim.plugins.extras.dap.core" },
  -- { import = "lazyvim.plugins.extras.test.core" },
  -- { import = "lazyvim.plugins.extras.ui.edgy" },
  -- { import = "lazyvim.plugins.extras.ui.mini-animate" },
  { import = "lazyvim.plugins.extras.util.mini-hipatterns" },
  { import = "lazyvim.plugins.extras.util.project" },

  {
    "ahmedkhalf/project.nvim",
    optional = true,
    opts = {
      patterns = { ".git", "!=.oh-my-zsh", "!=.asdf" },
    },
  },
}
