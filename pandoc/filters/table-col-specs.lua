function Pandoc(doc)
  if doc.meta.tableColSpecs == nil and doc.meta.tableColSpecsSameWidth == nil then
    return
  end

  local tableColSpecs = pandoc.json.decode(doc.meta.tableColSpecs or '[]');

  local tableId = 0
  function Table(table)
    tableId = tableId + 1
    local specs = tableColSpecs[tableId] or tableColSpecs[tostring(tableId)] or {}
    if #specs > 0 then
      for i, spec in ipairs(specs) do
        table.colspecs[i][2] = spec
      end
    elseif doc.meta.tableColSpecsSameWidth then
      local width = 1 / #table.colspecs
      for i, spec in ipairs(table.colspecs) do
        spec[2] = width
      end
    end
    return table
  end

  return doc:walk {Table = Table}
end
