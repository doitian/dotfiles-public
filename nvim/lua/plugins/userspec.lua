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
    config = function()
      if vim.fn.has("nvim-0.12") == 0 then
        return
      end

      -- dispatch#complete fires ShellCmdPost without saying which request finished
      local running = {}

      local function progress(id, status)
        local request = vim.fn["dispatch#request"](id)
        vim.api.nvim_echo({ { request.expanded } }, false, {
          id = "dispatch." .. id,
          kind = "progress",
          source = "vim-dispatch",
          status = status,
          title = "Dispatch",
        })
      end

      local group = vim.api.nvim_create_augroup("dispatch_progress", { clear = true })
      vim.api.nvim_create_autocmd("QuickFixCmdPost", {
        group = group,
        pattern = "dispatch-make",
        callback = function()
          local request = vim.fn["dispatch#request"]()
          if request.id and request.handler ~= "sync" and request.completed ~= 1 then
            running[request.id] = true
            progress(request.id, "running")
          end
        end,
      })
      vim.api.nvim_create_autocmd("ShellCmdPost", {
        group = group,
        callback = function()
          for id in pairs(running) do
            if vim.fn["dispatch#completed"](id) == 1 then
              running[id] = nil
              local request = vim.fn["dispatch#request"](id)
              local status = tonumber(vim.fn.readfile(request.file .. ".complete", "", 1)[1])
              progress(id, status == 0 and "success" or "failed")
              if status > 0 then
                vim.api.nvim_ui_send("\a")
              end
            end
          end
        end,
      })
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
