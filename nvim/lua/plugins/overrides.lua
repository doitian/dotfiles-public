-- vim: foldmethod=marker
local Util = require("lazyvim.util")
local function autozv(func)
  return function(...)
    func(...)
    vim.cmd.norm("zv")
  end
end

return {
  -- ui {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/ui.lua

  {
    "folke/noice.nvim",
    optional = true,
    opts = function(_, opts)
      return vim.tbl_deep_extend("force", opts, {
        messages = {
          view = "mini",
        },
        presets = {
          long_message_to_split = true,
        },
        routes = vim.list_extend({
          {
            filter = {
              event = "lsp",
              kind = "progress",
              any = {
                { find = "Validate documents" },
                { find = "Publish Diagnostics" },
              },
            },
            opts = { skip = true },
          },
          {
            filter = {
              event = "msg_show",
              kind = "",
              find = "nvim%-dap",
            },
            opts = { skip = true },
          },
          {
            filter = {
              event = "msg_show",
              any = {
                { cmdline = true, min_height = 2 },
                { cmdline = "args" },
              },
            },
            view = "popup",
          },
        }, opts.routes or {}),
      })
    end,
  },

  {
    "nvim-lualine/lualine.nvim",
    optional = true,
    opts = function(_, opts)
      -- no clock
      opts.sections.lualine_z = nil
      -- proxy flag
      table.insert(opts.sections.lualine_x, 2, {
        function()
          return "🛡️"
        end,
        cond = function()
          return vim.env.HTTP_PROXY ~= nil
        end,
      })
    end,
  },

  -- editor {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazy/vim/plugins/editor.lua

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
      { "<Leader>sq", "<Cmd>Telescope quickfix<CR>", desc = "Quickfix" },
      { "<Leader>sl", "<Cmd>Telescope loclist<CR>", desc = "Loclist" },
      { "<Leader>s/", "<Cmd>Telescope search_history<CR>", desc = "Loclist" },
    },
    opts = {
      defaults = {
        -- stylua: ignore
        vimgrep_arguments = { "rg", "--color=never", "--no-heading", "--with-filename", "--line-number", "--column", "--smart-case", "--hidden", "--glob", "!**/.git/*" },
      },
      pickers = {
        find_files = {
          -- stylua: ignore
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
    keys = function(_, keys)
      for _, key in ipairs(keys) do
        if key[1] == "[q" or key[1] == "]q" then
          key[2] = autozv(key[2])
        end
      end
    end,
  },

  -- coding {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/coding.lua
  {
    "L3MON4D3/LuaSnip",
    optional = true,
    opts = {
      store_selection_keys = "<Tab>",
    },
    keys = {
      {
        "<Leader>fS",
        function()
          require("functions.edit_snippet_files")()
        end,
        desc = "Edit Snippets",
      },
    },
    config = function(_, opts)
      require("luasnip").setup(opts)
      require("luasnip.loaders.from_vscode").lazy_load()
    end,
  },

  {
    "rafamadriz/friendly-snippets",
    enabled = false,
  },

  {
    "hrsh7th/nvim-cmp",
    optional = true,
    opts = {
      completion = {
        autocomplete = false,
      },
    },
    config = function(_, opts)
      local cmp = require("cmp")
      local luasnip = require("luasnip")

      local complete = opts.mapping["<C-Space>"]
      opts.mapping["<C-L>"] = function(fallback)
        if luasnip.expandable() then
          luasnip.expand()
        else
          complete(fallback)
        end
      end

      cmp.setup(opts)
      -- delay autocompletion using updatetime
      vim.api.nvim_create_autocmd("CursorHoldI", {
        group = vim.api.nvim_create_augroup("cmp_delay", { clear = true }),
        pattern = "*",
        callback = function()
          if not cmp.visible() then
            cmp.complete({ reason = cmp.ContextReason.Auto })
          end
        end,
      })
    end,
  },

  -- compatible mappings with surround
  {
    "folke/flash.nvim",
    optional = true,
    keys = function(_, keys)
      for _, k in ipairs(keys) do
        if k[1] == "S" then
          k.mode = { "n", "o" }
          break
        end
      end
      return vim.list_extend(keys, {
        -- use z becasue s is used by surround
        {
          "z",
          function()
            require("flash").jump()
          end,
          mode = { "o" },
          desc = "Flash",
        },
        { "ys", "gza", desc = "Add surrounding", remap = true },
        { "S", "gza", desc = "Add surrounding", mode = "x", remap = true },
        { "ds", "gzd", desc = "Delete surrounding", remap = true },
        { "cs", "gzr", desc = "Replace surrounding", remap = true },
      })
    end,
  },

  -- lsp {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/lsp/init.lua
  {
    "neovim/nvim-lspconfig",
    optional = true,
    dependencies = {
      -- Extras
      { import = "lazyvim.plugins.extras.formatting.prettier" },
      { import = "lazyvim.plugins.extras.lang.rust" },

      -- buggy: waiting for release
      -- { import = "lazyvim.plugins.extras.lang.yaml" },
      -- { import = "lazyvim.plugins.extras.lang.json" },

      { import = "lazyvim.plugins.extras.lang.go" },
      { import = "lazyvim.plugins.extras.lang.java" },
    },
    opts = {
      servers = {
        tsserver = {},
        ruff_lsp = {},
        yamlls = {},
        jsonls = {},
      },
    },
    init = function()
      local format = function()
        local lsp_format = require("lazyvim.plugins.lsp.format")
        if vim.b.autoformat == false or not lsp_format.enabled() then
          lsp_format.format({ force = true })
          vim.cmd.update()
        else
          vim.cmd.write()
        end
      end
      local keys = require("lazyvim.plugins.lsp.keymaps").get()
      keys[#keys + 1] = { "f<CR>", format, desc = "Format and save", has = "formatting" }
    end,
  },

  {
    "nvim-treesitter/nvim-treesitter",
    optional = true,
    opts = function(_, opts)
      if type(opts.ensure_installed) == "table" then
        vim.list_extend(opts.ensure_installed, { "ninja", "python", "rst", "toml", "yaml", "json", "json5", "jsonc" })
      end
    end,
  },

  {
    "jose-elias-alvarez/null-ls.nvim",
    optional = true,
    opts = function(_, opts)
      local nls = require("null-ls")
      vim.list_extend(opts.sources, {
        nls.builtins.formatting.autopep8,
      })
    end,
  },

  {
    "williamboman/mason.nvim",
    optional = true,
    opts = function(_, opts)
      vim.list_extend(opts.ensure_installed, {
        "autopep8",
      })
    end,
  },

  { "udalov/kotlin-vim", ft = "kotlin" },

  -- treesitter {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/treesitter.lua
  {
    "RRethy/vim-illuminate",
    optional = true,
    config = function(_, opts)
      -- Use default <M-n> <M-p>
      require("illuminate").configure(opts)
    end,
    keys = function()
      return {}
    end,
  },

  -- imports {{{1
  -- :let @/ = "[- ]*"
  { import = "lazyvim.plugins.extras.coding.copilot" },
  -- { import = "lazyvim.plugins.extras.dap.core" },
  -- { import = "lazyvim.plugins.extras.test.core" },
  -- IDE like window layout
  -- { import = "lazyvim.plugins.extras.ui.edgy" },
  -- { import = "lazyvim.plugins.extras.ui.mini-animate" },
  { import = "lazyvim.plugins.extras.util.mini-hipatterns" },

  -- }}}1
}
