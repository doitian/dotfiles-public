return {
  config = {},
  setup = function()
    vim.api.nvim_create_user_command("Bm", function(opts)
      local message = opts.args == #"" and vim.fn.line(".") or opts.args
      local line = vim.fn.expand("%") .. "|" .. vim.fn.line(".") .. " col " .. vim.fn.col(".") .. "| " .. message
      vim.fn.writefile({ line }, "bookmarks.qf", "a")
    end, { desc = "Save into bookmarks.qf", nargs = "*" })
  end,
}
