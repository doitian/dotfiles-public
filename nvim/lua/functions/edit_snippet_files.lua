local snippets_dir = vim.fn.stdpath("config") .. "/snippets/"

local opts = {
  format = function(file)
    return file:gsub(".*/(.+/.+)/snippets/", "%1 -> ")
  end,
  extend = function(ft)
    local filename = ft .. ".json"
    local path = snippets_dir .. filename
    if vim.fn.filereadable(path) == 0 then
      return { { "(CREATE) " .. filename, path } }
    end
    return {}
  end,
}

return function()
  require("luasnip.loaders").edit_snippet_files(opts)
end
