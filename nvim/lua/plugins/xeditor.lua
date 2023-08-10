-- https://github.com/LazyVim/LazyVim/blob/main/lua/lazy/vim/plugins/editor.lua
local Util = require("lazyvim.util")

return {
  -- { "folke/which-key.nvim", enabled = false },
  {
    "nvim-telescope/telescope.nvim",
    optional = true,
    cmd = "Telescope",
    keys = {
      -- always use find_files instead of git_files
      { "<Leader><Space>", Util.telescope("find_files"), desc = "Find Files (root dir)" },
      { "<Leader>ff", Util.telescope("find_files"), desc = "Find Files (root dir)" },
      { "<Leader>fF", Util.telescope("find_files", { cwd = false }), desc = "Find Files (cwd)" },
      { "<Leader>fh", Util.telescope("find_files", { cwd = "%:h" }), desc = "Find Files Here" },
      { "<Leader>sB", "<Cmd>Telescope live_grep grep_open_files=true<CR>", desc = "All Buffers" },
      { "<Leader>si", "<Cmd>Telescope current_buffer_ctags<CR>", desc = "BTags" },
      { "<Leader>s<C-I>", "<Cmd>Telescope current_buffer_tags<CR>", desc = "Tags (Buffer)" },
      { "<Leader>sI", "<Cmd>Telescope tags<CR>", desc = "Tags" },
    },
    opts = {
      defaults = {
        vimgrep_arguments = {
          "rg",
          "--color=never",
          "--no-heading",
          "--with-filename",
          "--line-number",
          "--column",
          "--smart-case",
          "--hidden",
          "--glob",
          "!**/.git/*",
        },
      },
      pickers = {
        find_files = {
          find_command = { "fd", "--type", "f", "--hidden", "--follow", "--exclude", ".git" },
        },
      },
    },
    config = function(_, opts)
      local telescope = require("telescope")
      telescope.setup(opts)
      telescope.load_extension("current_buffer_ctags")
    end,
  },

  {
    "folke/trouble.nvim",
    keys = {
      {
        "[q",
        function()
          if require("trouble").is_open() then
            require("trouble").previous({ skip_groups = true, jump = true })
          else
            local ok, err = pcall(vim.cmd.cprev)
            if not ok then
              return vim.notify(err, vim.log.levels.ERROR)
            end
          end
          vim.cmd.norm("zv")
        end,
        desc = "Previous trouble/quickfix item",
      },
      {
        "]q",
        function()
          if require("trouble").is_open() then
            require("trouble").next({ skip_groups = true, jump = true })
          else
            local ok, err = pcall(vim.cmd.cnext)
            if not ok then
              return vim.notify(err, vim.log.levels.ERROR)
            end
          end
          vim.cmd.norm("zv")
        end,
        desc = "Next trouble/quickfix item",
      },
    },
  },
}
