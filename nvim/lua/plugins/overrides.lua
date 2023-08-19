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
          enabled = false,
        },
        cmdline = {
          view = "cmdline",
        },
        views = {
          mini = { position = { row = -2 } },
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
        }, opts.routes or {}),
      })
    end,
  },

  {
    "nvim-lualine/lualine.nvim",
    optional = true,
    opts = function(_, opts)
      opts.options.globalstatus = false
      -- no clock
      opts.sections.lualine_z = nil
      opts.sections.lualine_c[3] = function()
        local fn = vim.fn.expand("%:~:.")
        if vim.startswith(fn, "jdt://") then
          fn = string.sub(fn, 0, string.find(fn, "?") - 1)
        end
        if vim.bo.modified then
          fn = fn .. "  "
        end
        if vim.bo.modifiable == false or vim.bo.readonly == true then
          fn = fn .. " 󰍁 "
        end
        return fn
      end
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

  {
    "akinsho/bufferline.nvim",
    optional = true,
    opts = {
      options = {
        numbers = function(opts)
          return opts.ordinal
        end,
        show_buffer_close_icons = false,
        tab_size = 8,
      },
    },
    keys = function()
      local sort_by_none = function()
        require("bufferline").sort_by("none")
      end
      local go_to = function()
        local bufferline = require("bufferline")
        if vim.v.count == 0 then
          bufferline.pick()
        else
          bufferline.go_to(vim.v.count, true)
        end
      end
      local toggle_pin = function()
        require("bufferline.groups").toggle_pin()
        vim.schedule(sort_by_none)
      end
      local move_to = function()
        require("bufferline").move_to(vim.v.count1)
      end
      local nth = function(n)
        return function()
          require("bufferline").go_to(n)
        end
      end
      local move_to_nth = function(n)
        return function()
          require("bufferline").move_to(n)
        end
      end
      return {
        { "<Leader>bp", toggle_pin, desc = "Toggle pin" },
        { "<Leader>bP", "<Cmd>BufferLineGroupClose ungrouped<CR>", desc = "Delete non-pinned buffers" },
        { "<leader>bj", go_to, desc = "Go to buffer" },
        { "<leader>j", go_to, desc = "Go to buffer" },
        { "<Leader>b.", move_to, desc = "Move buffer" },
        { "<Leader>bx", "<Cmd>BufferLinePickClose<CR>", desc = "Pick buffer to close" },
        { "<Leader>boo", sort_by_none, desc = "Renumber buffers" },
        { "<Leader>bod", "<Cmd>BufferLineSortByDirectory<CR>", desc = "Sort buffers by directory" },
        { "<Leader>boe", "<Cmd>BufferLineSortByExtension<CR>", desc = "Sort buffers by extension" },
        { "<Leader>bor", "<Cmd>BufferLineSortByRelativeDirectory<CR>", desc = "Sort buffers by relative directory" },
        { "<Leader>bot", "<Cmd>BufferLineSortByTabs<CR>", desc = "Sort buffers by tags" },
        { "<Leader>1", nth(1), desc = "which_key_ignore" },
        { "<Leader>2", nth(2), desc = "which_key_ignore" },
        { "<Leader>3", nth(3), desc = "which_key_ignore" },
        { "<Leader>4", nth(4), desc = "which_key_ignore" },
        { "<Leader>5", nth(5), desc = "which_key_ignore" },
        { "<Leader>6", nth(6), desc = "which_key_ignore" },
        { "<Leader>7", nth(7), desc = "which_key_ignore" },
        { "<Leader>8", nth(8), desc = "which_key_ignore" },
        { "<Leader>9", nth(9), desc = "which_key_ignore" },
        { "<Leader>0", nth(-1), desc = "which_key_ignore" },
        { "<Leader>!", move_to_nth(1), desc = "which_key_ignore" },
        { "<Leader>@", move_to_nth(2), desc = "which_key_ignore" },
        { "<Leader>#", move_to_nth(3), desc = "which_key_ignore" },
        { "<Leader>$", move_to_nth(4), desc = "which_key_ignore" },
        { "<Leader>%", move_to_nth(5), desc = "which_key_ignore" },
        { "<Leader>^", move_to_nth(6), desc = "which_key_ignore" },
        { "<Leader>&", move_to_nth(7), desc = "which_key_ignore" },
        { "<Leader>*", move_to_nth(8), desc = "which_key_ignore" },
        { "<Leader>(", move_to_nth(9), desc = "which_key_ignore" },
        { "<Leader>)", move_to_nth(-1), desc = "which_key_ignore" },
      }
    end,
  },

  -- editor {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazy/vim/plugins/editor.lua

  { "folke/which-key.nvim", optional = true, opts = { defaults = { ["<Leader>bo"] = { name = "+sort" } } } },

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
        rust_analyzer = {
          settings = {
            ["rust-analyzer"] = {
              files = { excludeDirs = { "bin/test", "bin/main", "node_modules", "var", "run" } },
            },
          },
        },
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
      -- opts.debug = true
      local nls = require("null-ls")
      vim.list_extend(opts.sources, {
        nls.builtins.formatting.autopep8,
        nls.builtins.formatting.prettier,
        nls.builtins.formatting.bean_format,
      })
    end,
  },

  {
    "williamboman/mason.nvim",
    optional = true,
    opts = function(_, opts)
      vim.list_extend(opts.ensure_installed, {
        "autopep8",
        "prettier",
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
