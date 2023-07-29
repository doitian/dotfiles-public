return {
  config = {},
  setup = function()
    vim.api.nvim_create_user_command("DiffOrig", function(_)
      vim.cmd.new({ mods = { vertical = true } })
      vim.opt_local.buftype = "nofile"
      vim.cmd.r("#")
      vim.cmd("0d_")
      vim.cmd.diffthis()
      vim.cmd.wincmd("p")
      vim.cmd.diffthis()
    end, { desc = "Diff with original" })
  end,
}
