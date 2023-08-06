local has_telescope, telescope = pcall(require, "telescope")
if not has_telescope then
  error("This plugins requires nvim-telescope/telescope.nvim")
end

local current_buffer_ctags = function(opts)
  opts = vim.tbl_extend("force", {
    -- dummy file to skip the checking
    ctags_file = "tags",
    entry_maker = require("telescope.make_entry").gen_from_ctags({
      bufnr = vim.api.nvim_get_current_buf(),
    }),
  }, opts or {})
  opts.finder = require("telescope.finders").new_oneshot_job({
    "ctags",
    "-f",
    "-",
    "--excmd=number",
    vim.fn.expand("%"),
  }, opts)

  return require("telescope.builtin").current_buffer_tags(opts)
end

return telescope.register_extension({
  exports = {
    current_buffer_ctags = current_buffer_ctags,
  },
})
