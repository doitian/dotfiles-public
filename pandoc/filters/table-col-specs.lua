function Pandoc(doc)
  if doc.meta.tableColSpecs == nil and doc.meta.tableColSpecsSameWidth == nil then
    return
  end

  local tableColSpecs = pandoc.json.decode(doc.meta.tableColSpecs or '[]');

  local tableId = 0
  for _, block in ipairs(doc.blocks) do
    if block.t == 'Table' then
      tableId = tableId + 1
      local specs = tableColSpecs[tableId] or {}
      if #specs > 0 then
        for i, spec in ipairs(specs) do
          block.colspecs[i][2] = spec
        end
      elseif doc.meta.tableColSpecsSameWidth then
        local width = 1 / #block.colspecs
        for i, spec in ipairs(block.colspecs) do
          spec[2] = width
        end
      end
    end
  end

  return doc
end
