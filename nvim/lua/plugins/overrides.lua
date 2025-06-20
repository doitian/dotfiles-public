-- vim: foldmethod=marker
local function autozv(func)
  return function(...)
    func(...)
    vim.cmd.norm("zv")
  end
end
local format = function()
  local lazy_format = require("lazyvim.util.format")
  if vim.b.autoformat == false or not lazy_format.enabled() then
    lazy_format.format({ force = true })
    vim.cmd.update()
  else
    vim.cmd.write()
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
        views = {
          mini = { position = { row = -2 } },
        },
        routes = vim.list_extend({
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
      table.insert(opts.sections.lualine_x, 2, {
        function()
          return "󰚻 "
        end,
        cond = function()
          return vim.env.http_proxy ~= nil
        end,
      })
      opts.sections.lualine_z = {}
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
    keys = function(_, keys)
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
      return vim.list_extend(
        vim.tbl_filter(function(item)
          return item[1] ~= "<leader>bp"
        end, keys),
        {
          { "<Leader>bp", toggle_pin, desc = "Toggle pin" },
          { "<leader>bj", go_to, desc = "Go to buffer" },
          { "<leader>j", go_to, desc = "Go to buffer" },
          { "<Leader>b.", move_to, desc = "Move buffer" },
          { "<Leader>bs", "<Cmd>BufferLinePick<CR>", desc = "Pick buffer" },
          { "<Leader>bx", "<Cmd>BufferLinePickClose<CR>", desc = "Pick buffer to close" },
          { "<Leader>bnn", sort_by_none, desc = "Renumber buffers" },
          { "<Leader>bnd", "<Cmd>BufferLineSortByDirectory<CR>", desc = "Sort buffers by directory" },
          { "<Leader>bne", "<Cmd>BufferLineSortByExtension<CR>", desc = "Sort buffers by extension" },
          { "<Leader>bnr", "<Cmd>BufferLineSortByRelativeDirectory<CR>", desc = "Sort buffers by relative directory" },
          { "<Leader>bnt", "<Cmd>BufferLineSortByTabs<CR>", desc = "Sort buffers by tags" },
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
      )
    end,
  },

  -- editor {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/editor.lua

  { "folke/which-key.nvim", optional = true, opts = { spec = { { "<Leader>bn", group = "sort" } } } },

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

  {
    "folke/todo-comments.nvim",
    opts = {
      highlight = {
        pattern = [[.*<(KEYWORDS)(\([^)]+\))?:]],
      },
      search = {
        pattern = [[\b(KEYWORDS)(\([^)]+\))?:]],
      },
    },
  },

  -- compatible mappings with surround
  {
    "folke/flash.nvim",
    optional = true,
    keys = {
      -- use z becasue s is used by surround
      {
        "z",
        function()
          require("flash").jump()
        end,
        mode = { "o" },
        desc = "Flash",
      },
      { "ys", "gsa", desc = "Add surrounding", remap = true },
      { "S", "gsa", desc = "Add surrounding", mode = "x", remap = true },
      { "ds", "gsd", desc = "Delete surrounding", remap = true },
      { "cs", "gsr", desc = "Replace surrounding", remap = true },
    },
  },

  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/extras/editor/fzf.lua
  {
    "ibhagwan/fzf-lua",
    optional = true,
    keys = {
      { "<Leader>fh", LazyVim.pick("files", { cwd = "%:h" }), desc = "Find Files Here" },
      { "<Leader>s/", "<Cmd>FzfLua search_history<CR>", desc = "Search History" },
    },
    opts = {
      files = {
        git_icons = false,
        fd_opts = [[--color=never --type f --hidden --follow --exclude .git --path-separator /]],
      },
    },
  },

  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/extras/editor/snacks_picker.lua
  {
    "folke/snacks.nvim",
    optional = true,
    keys = {
      {
        "<Leader>fh",
        function()
          LazyVim.pick.open("files", { cwd = vim.fn.expand("%:h") })
        end,
        desc = "Find Files Here",
      },
    },
    opts = function(_, opts)
      opts.terminal.win.keys = nil
      return vim.tbl_deep_extend("force", opts, {
        picker = {
          sources = {
            files = {
              hidden = true,
              args = { "--path-separator", "/" },
            },
          },
        },
      })
    end,
  },

  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/extras/editor/overseer.lua
  {
    "stevearc/overseer.nvim",
    optional = true,
    opts = {
      templates = { "builtin", "mise" },
    },
    keys = {
      {
        "g<CR>",
        function()
          local overseer = require("overseer")
          local tasks = overseer.list_tasks({ recent_first = true })
          if vim.tbl_isempty(tasks) then
            vim.notify("No tasks found", vim.log.levels.WARN)
          else
            overseer.run_action(tasks[1], "restart")
          end
        end,
        desc = "Rerun Last Task",
      },
    },
  },

  -- coding {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/coding.lua

  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/extras/coding/blink.lua
  {
    "rafamadriz/friendly-snippets",
    enabled = false,
  },
  {
    "saghen/blink.cmp",
    optional = true,
    opts = {
      completion = {
        menu = {
          auto_show = false,
        },
        ghost_text = {
          enabled = false,
        },
      },
      sources = {
        providers = {
          snippets = {
            opts = {
              friendly_snippets = false,
              search_paths = {
                vim.fn.stdpath("config") .. "/snippets",
                vim.fn.expand("~/.dotfiles/repos/private/nvim/snippets"),
              },
            },
          },
        },
      },
      keymap = {
        preset = "enter",
        ["<C-L>"] = {
          function(cmp)
            if cmp.snippet_active() then
              return cmp.accept()
            else
              return cmp.select_and_accept()
            end
          end,
          "show",
        },
      },
    },
  },
  {
    "saghen/blink.cmp",
    optional = true,
    opts = function()
      local blink_user_au = vim.api.nvim_create_augroup("blink_user_au", { clear = true })
      vim.api.nvim_create_autocmd("CursorHoldI", {
        group = blink_user_au,
        pattern = "*",
        callback = function()
          local cmp = require("blink.cmp")
          if not cmp.is_visible() then
            cmp.show()
          end
        end,
      })
    end,
  },

  -- lsp {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/lsp/init.lua

  {
    "neovim/nvim-lspconfig",
    optional = true,
    opts = {
      servers = {
        tsserver = {},
        ruff = {
          keys = {
            {
              "<leader>co",
              function()
                vim.lsp.buf.code_action({
                  apply = true,
                  context = {
                    only = { "source.organizeImports" },
                    diagnostics = {},
                  },
                })
              end,
              desc = "Organize Imports",
            },
          },
        },
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
    keys = {
      { "f<CR>", format, desc = "Format and save" },
    },
  },

  {
    "mason-org/mason.nvim",
    optional = true,
    opts = function(_, opts)
      vim.list_extend(opts.ensure_installed, {
        "markdownlint",
        "ruff",
      })
    end,
  },

  { "udalov/kotlin-vim", ft = "kotlin" },

  -- formatting {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/formatting.lua

  {
    "stevearc/conform.nvim",
    optional = true,
    opts = {
      formatters_by_ft = {
        ["markdown"] = { "markdownlint" },
        ["python"] = { "ruff_format" },
      },
    },
  },

  -- treesitter {{{1
  -- https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/plugins/treesitter.lua

  {
    "nvim-treesitter/nvim-treesitter",
    optional = true,
    opts = function(_, opts)
      opts.ensure_installed = vim.list_extend(opts.ensure_installed or {}, {
        "bash",
        "c",
        "cpp",
        "json",
        "json5",
        "jsonc",
        "markdown",
        "markdown_inline",
        "ninja",
        "python",
        "regex",
        "toml",
        "yaml",
      })
    end,
  },

  -- }}}1
}
