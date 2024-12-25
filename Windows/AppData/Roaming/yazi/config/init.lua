require("mime-ext"):setup({
  with_files = {
    [".gitmodules"] = "text/plain",
    ["COPYING"] = "text/plain",
    ["bashrc"] = "text/plain",
    ["zshrc"] = "text/plain",
    ["makefile"] = "text/plain",
  },

  with_exts = {
    ps1 = "text/plain",
  },

  fallback_file1 = true,
})
