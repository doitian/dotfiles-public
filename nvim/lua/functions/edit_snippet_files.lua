local snippets_dir = vim.fn.resolve(vim.fn.stdpath("config")) .. "/snippets/"

local opts = {
  format = function(path)
    return path:gsub(".*/(.+/.+)/snippets/", "%1 -> ")
  end,
  extend = function(ft, paths)
    for _, path in ipairs(paths) do
      if path:find(snippets_dir) == 1 then
        return {}
      end
    end

    local filename = ft .. ".json"
    return { { "(CREATE) " .. filename, snippets_dir .. filename } }
  end,
}

return function()
  require("luasnip.loaders").edit_snippet_files(opts)
end
