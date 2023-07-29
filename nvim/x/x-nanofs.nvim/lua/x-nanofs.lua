return {
  config = {},
  setup = function()
    vim.api.nvim_create_user_command("Delete", function()
      vim.fn.delete(vim.fn.expand("%"))
      vim.cmd.bdelete()
      ---@diagnostic disable-next-line: param-type-mismatch
      vim.fn.setreg("#", vim.fn.bufnr("%"))
    end, {})

    vim.api.nvim_create_user_command("Move", function(opts)
      vim.cmd.saveas(opts.fargs[1])
      vim.fn.delete(vim.fn.expand("#"))
      vim.cmd.bdelete("#")
      ---@diagnostic disable-next-line: param-type-mismatch
      vim.fn.setreg("#", vim.fn.bufnr("%"))
    end, { nargs = 1, complete = "file" })
  end,
}
